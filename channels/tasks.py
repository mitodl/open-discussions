"""Channels tasks"""
import logging
import traceback

import celery
from django.conf import settings
from django.contrib.auth import get_user_model
from prawcore.exceptions import ResponseException

from channels import api
from channels.api import (
    Api,
    sync_channel_subscription_model,
    add_user_role,
    get_allowed_post_types_from_link_type,
)
from channels.constants import (
    ROLE_MODERATORS,
    ROLE_CONTRIBUTORS,
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
    EXTENDED_POST_TYPE_ARTICLE,
)
from channels.models import Channel, Post
from open_discussions.celery import app
from open_discussions.utils import chunks
from search.exceptions import PopulateUserRolesException, RetryException

User = get_user_model()
log = logging.getLogger()


@app.task()
def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    api.evict_expired_access_tokens()


@app.task
def subscribe_all_users_to_default_channel(*, channel_name):
    """
    Subscribes all users to a new default channel

    Args:
        channel_name (str): The name of the channel
    """
    chunk_size = settings.OPEN_DISCUSSIONS_DEFAULT_CHANNEL_BACKPOPULATE_BATCH_SIZE
    query = (
        User.objects.exclude(username=settings.INDEXING_API_USERNAME)
        .values_list("username", flat=True)
        .iterator()
    )

    for usernames in chunks(query, chunk_size=chunk_size):
        subscribe_user_range_to_default_channel.delay(
            channel_name=channel_name, usernames=usernames
        )


@app.task
def subscribe_user_range_to_default_channel(*, channel_name, usernames):
    """
    Subscribes all users to a new default channel

    Args:
        channel_name (str): The name of the channel
        usernames (list of str): list of user usernames
    """
    api_user = User.objects.get(username=settings.INDEXING_API_USERNAME)
    admin_api = api.Api(api_user)
    # walk the usernames and add them as subscribers
    for username in usernames:
        admin_api.add_subscriber(username, channel_name)


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def populate_user_subscriptions(user_ids):
    """
    Populate channel user roles for a list of user ids

    Args:
        user_ids(list of int): List of user ids
    """
    for user in User.objects.filter(id__in=user_ids).iterator():
        client = Api(user)
        channels = client.list_channels()
        for channel in channels:
            sync_channel_subscription_model(channel.display_name, user=user)


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def populate_user_roles(channel_ids):
    """
    Populate channel user roles for a list of channel ids

    Args:
        channel_ids(list of int): List of channel ids
    """
    client = Api(User.objects.get(username=settings.INDEXING_API_USERNAME))

    for channel in Channel.objects.filter(id__in=channel_ids):
        try:
            for moderator in client.list_moderators(channel.name):
                user = User.objects.filter(username=moderator.name).first()
                if user:
                    add_user_role(channel, ROLE_MODERATORS, user)
            for contributor in client.list_contributors(channel.name):
                user = User.objects.filter(username=contributor.name).first()
                if user:
                    add_user_role(channel, ROLE_CONTRIBUTORS, user)
        except ResponseException:
            # This could mean the indexing user cannot access a channel, which is a bug.
            # We need to raise a different exception here because celery doesn't handle PRAW exceptions correctly.
            raise PopulateUserRolesException(
                f"ResponseException received for channel {channel}: {traceback.format_exc()}"
            )


@app.task(bind=True)
def populate_subscriptions_and_roles(self):
    """Populate channel roles and subscriptions for all users and channels"""
    results = celery.group(
        [
            populate_user_subscriptions.si(ids)
            for ids in chunks(
                User.objects.exclude(username=settings.INDEXING_API_USERNAME)
                .exclude(profile__isnull=True)
                .order_by("id")
                .values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]
        + [
            populate_user_roles.si(ids)
            for ids in chunks(
                Channel.objects.values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]
    )
    raise self.replace(results)


@app.task
def populate_post_post_type(ids):
    """
    Populates Post.post_type for a range of posts

    Args:
        ids (list of int): list of post ids
    """
    client = Api(User.objects.get(username=settings.INDEXING_API_USERNAME))

    for post in Post.objects.filter(id__in=ids).iterator():
        if post.post_type:
            continue

        submission = client.get_submission(post.post_id)
        if submission.url:
            post.post_type = LINK_TYPE_LINK
        elif post.article:
            post.post_type = EXTENDED_POST_TYPE_ARTICLE
        else:
            post.post_type = LINK_TYPE_SELF

        post.savE()


@app.task
def populate_channel_post_type(channel_ids):
    """
    Populates Post.post_type for a range of posts

    Args:
        channel_ids (list of int): list of post ids
    """
    client = Api(User.objects.get(username=settings.INDEXING_API_USERNAME))

    for channel in Channel.objects.filter(id__in=channel_ids).iterator():
        if channel.allowed_post_types:
            continue

        subreddit = client.get_subreddit(channel.display_name)
        channel.allowed_post_types = get_allowed_post_types_from_link_type(
            subreddit.submission_type
        )
        channel.save()


@app.task(bind=True)
def populate_post_and_channel_types(self):
    """
    Populates Channel.allowed_post_types and Post.post_type
    """
    results = celery.group(
        [
            populate_post_post_type.si(ids)
            for ids in chunks(
                Post.objects.values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]
        + [
            populate_channel_post_type.si(ids)
            for ids in chunks(
                Channel.objects.values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]
    )
    raise self.replace(results)
