"""Channels tasks"""
import logging

import celery
from django.conf import settings
from django.contrib.auth import get_user_model

from channels import api
from channels.api import Api, sync_channel_subscription_model, add_user_role
from channels.constants import ROLE_MODERATORS, ROLE_CONTRIBUTORS
from channels.models import Channel
from open_discussions.celery import app
from open_discussions.utils import chunks
from search.exceptions import RetryException

User = get_user_model()
log = logging.getLogger()


@app.task()
def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    api.evict_expired_access_tokens()


@app.task
def sync_comment_model(*, channel_name, post_id, comment_id, parent_id):
    """
    Create or update local comment id information

    Args:
        channel_name (str): The name of the channel
        post_id (str): The id of the post
        comment_id (str): The id of the comment
        parent_id (str): The id of the reply comment. If None the parent is the post
    """
    api.sync_comment_model(
        channel_name=channel_name,
        post_id=post_id,
        comment_id=comment_id,
        parent_id=parent_id,
    )


@app.task
def sync_post_model(*, channel_name, post_id, post_url):
    """
    Create or update local post id information

    Args:
        channel_name (str): The name of the channel
        post_id (str): The id of the post
        post_url(str): The external url of a link post
    """
    api.sync_post_model(channel_name=channel_name, post_id=post_id, post_url=post_url)


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
        for moderator in client.list_moderators(channel.name):
            user = User.objects.filter(username=moderator.name).first()
            if user:
                add_user_role(channel.name, ROLE_MODERATORS, user)
        for contributor in client.list_contributors(channel.name):
            user = User.objects.filter(username=contributor.name).first()
            if user:
                add_user_role(channel.name, ROLE_CONTRIBUTORS, user)


@app.task(bind=True)
def populate_subscriptions_and_roles(self):
    """Populate channel roles and subscriptions for all users and channels"""
    results = celery.group(
        [
            populate_user_subscriptions.si(ids)
            for ids in chunks(
                User.objects.exclude(username=settings.INDEXING_API_USERNAME)
                .exclude(profile__isnull=True)
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
