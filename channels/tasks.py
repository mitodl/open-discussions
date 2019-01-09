"""Channels tasks"""
import logging
import traceback
from urllib.parse import urljoin

import base36
import celery
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.shortcuts import reverse
from prawcore.exceptions import ResponseException

from channels import api, backpopulate_api
from channels.api import (
    Api,
    sync_channel_subscription_model,
    add_user_role,
    get_admin_api,
    get_allowed_post_types_from_link_type,
    allowed_post_types_bitmask,
)
from channels.constants import ROLE_MODERATORS, ROLE_CONTRIBUTORS
from channels.models import Channel, Post, ChannelGroupRole, ChannelInvitation
from mail import api as mail_api
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
    admin_api = get_admin_api()
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
    client = get_admin_api()
    for channel in Channel.objects.filter(id__in=channel_ids):
        try:
            role = ROLE_MODERATORS
            ChannelGroupRole.objects.get_or_create(
                channel=channel,
                role=role,
                group=Group.objects.get_or_create(name=f"{channel.name}_{role}")[0],
            )
            for moderator in client.list_moderators(channel.name):
                user = User.objects.filter(username=moderator.name).first()
                if user:
                    add_user_role(channel, ROLE_MODERATORS, user)
            role = ROLE_CONTRIBUTORS
            ChannelGroupRole.objects.get_or_create(
                channel=channel,
                role=role,
                group=Group.objects.get_or_create(name=f"{channel.name}_{role}")[0],
            )
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
                Channel.objects.order_by("id").values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]
    )
    raise self.replace(results)


@app.task
def populate_post_and_comment_fields_batch(ids):
    """
    Populates Post.post_type for a range of posts

    Args:
        ids (list of int): list of post ids
    """
    client = get_admin_api()

    for post in Post.objects.filter(id__in=ids).iterator():
        submission = client.get_submission(post.post_id)

        backpopulate_api.backpopulate_post(post=post, submission=submission)
        backpopulate_api.backpopulate_comments(post=post, submission=submission)


@app.task(bind=True)
def populate_post_and_comment_fields(self):
    """
    Populates Post fields
    """
    results = celery.group(
        [
            populate_post_and_comment_fields_batch.si(ids)
            for ids in chunks(
                Post.objects.order_by("id").values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]
    )
    raise self.replace(results)


@app.task
def populate_channel_fields_batch(channel_ids):
    """
    Populates Channel fields from reddit for a list of channel ids

    Args:
        channel_ids (list of int): list channel post ids
    """
    client = get_admin_api()

    for channel in Channel.objects.filter(id__in=channel_ids).iterator():
        if all(
            getattr(channel, field)
            for field in ["allowed_post_types", "title", "channel_type"]
        ):
            continue

        subreddit = client.get_subreddit(channel.name)

        if not channel.allowed_post_types:
            channel.allowed_post_types = allowed_post_types_bitmask(
                get_allowed_post_types_from_link_type(subreddit.submission_type)
            )

        if not channel.title:
            channel.title = subreddit.title

        if not channel.channel_type:
            channel.channel_type = subreddit.subreddit_type

        channel.save()


@app.task(bind=True)
def populate_channel_fields(self):
    """
    Populates Channel fields from reddit for all channels
    """
    results = celery.group(
        [
            populate_channel_fields_batch.si(ids)
            for ids in chunks(
                Channel.objects.values_list("id", flat=True),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        ]
    )
    raise self.replace(results)


@app.task()
def populate_posts_and_comments(post_ids):
    """
    Backpopulates a list of post ids

    Args:
        post_ids (list of int): list of reddit post ids in integer form

    Returns:
        dict: aggregated result data for this batch
    """
    admin_api = get_admin_api()

    # brute force this because /api/info does not return all submissions for an unknown reason
    submissions = []
    for post_id in post_ids:
        try:
            submission = admin_api.get_submission(base36.dumps(post_id))
            # force a fetch so any loading errors get caught now
            submission._fetch()  # pylint: disable=protected-access
            submissions.append(submission)
        except:  # pylint: disable=bare-except
            log.warning("Could not find submission '%s'", post_id)

    channels_by_name = Channel.objects.in_bulk(
        [submission.subreddit.display_name for submission in submissions],
        field_name="name",
    )
    post_count = 0
    comment_count = 0
    failures = []

    for submission in submissions:
        channel_name = submission.subreddit.display_name

        # skip posts that don't have a matching channel, we don't want to auto-create these
        if channel_name not in channels_by_name:
            log.warning(
                "Unknown channel name %s, not populating post %s",
                channel_name,
                submission.id,
            )
            failures.append(
                {
                    "thing_type": "post",
                    "thing_id": submission.id,
                    "reason": "unknown channel '{}'".format(channel_name),
                }
            )
            continue

        post, _ = Post.objects.get_or_create(
            post_id=submission.id,
            defaults={"channel": channels_by_name.get(channel_name)},
        )

        backpopulate_api.backpopulate_post(post=post, submission=submission)
        post_count += 1

        comment_count += backpopulate_api.backpopulate_comments(
            post=post, submission=submission
        )
    return {"posts": post_count, "comments": comment_count, "failures": failures}


@app.task()
def populate_posts_and_comments_merge_results(results):
    """
    Merges results of backpopulate_posts_and_comments

    Args:
        results (iterable of dict): iterable of batch task results

    Returns:
        dict: merged result data for all batches
    """
    post_count = 0
    comment_count = 0
    failures = []

    for result in results:
        post_count += result["posts"]
        comment_count += result["comments"]
        failures.extend(result["failures"])

    return {"posts": post_count, "comments": comment_count, "failures": failures}


@app.task(bind=True)
def populate_all_posts_and_comments(self):
    """
    Backpopulate all posts and comments
    """
    reddit_api = get_admin_api().reddit

    # fetch and base36 decode the latest post id
    newest_post_id = base36.loads(next(reddit_api.front.new()).id)

    # create a celery chord by batching a backpopulate and merging results
    results = (
        celery.group(
            populate_posts_and_comments.si(post_ids)
            for post_ids in chunks(
                range(newest_post_id + 1),
                chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
            )
        )
        | populate_posts_and_comments_merge_results.s()
    )

    raise self.replace(results)


@app.task
def send_invitation_email(channel_invitation_id):
    """
    Sends a channel invitation

    Args:
        channel_invitation_id (int): the id of the ChannelInvitation
    """
    invite = ChannelInvitation.objects.get(id=channel_invitation_id)

    signup_url = urljoin(settings.SITE_BASE_URL, reverse("signup"))

    mail_api.send_messages(
        list(
            mail_api.messages_for_recipients(
                [
                    (
                        invite.email,
                        mail_api.context_for_user(
                            extra_context={"invite": invite, "signup_url": signup_url}
                        ),
                    )
                ],
                "invite",
            )
        )
    )
