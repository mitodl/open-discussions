"""Channels tasks"""
from itertools import islice
import logging
import traceback
from urllib.parse import urljoin

import base36
import celery
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType
from django.shortcuts import reverse
from prawcore.exceptions import ResponseException

from channels import api, backpopulate_api, membership_api
from channels.api import (
    Api,
    sync_channel_subscription_model,
    add_user_role,
    get_admin_api,
    get_allowed_post_types_from_link_type,
    allowed_post_types_bitmask,
)
from channels.spam import create_akismet_client
from channels.constants import ROLE_MODERATORS, ROLE_CONTRIBUTORS
from channels.models import (
    Channel,
    Post,
    ChannelGroupRole,
    ChannelInvitation,
    Comment,
    SpamCheckResult,
)
from channels.spam import SpamChecker, save_spam_result
from channels.utils import SORT_NEW_LISTING_PARAMS, SORT_HOT_LISTING_PARAMS
from authentication.models import BlockedEmailRegex
from mail import api as mail_api
from open_discussions.celery import app
from open_discussions.utils import chunks
from search.exceptions import PopulateUserRolesException, RetryException
from search import task_helpers
from notifications.tasks import notify_moderators

User = get_user_model()
log = logging.getLogger()

SPAM_CHECKER = SpamChecker()


@app.task()
def evict_expired_access_tokens():
    """Evicts expired access tokens"""
    api.evict_expired_access_tokens()


@app.task(bind=True)
def subscribe_all_users_to_channels(self, *, channel_names):
    """
    Subscribes all users to a set of channels

    Args:
        channel_names (list of str): the names of the channels to subscribe to
    """
    chunk_size = settings.OPEN_DISCUSSIONS_DEFAULT_CHANNEL_BACKPOPULATE_BATCH_SIZE
    query = (
        User.objects.exclude(username=settings.INDEXING_API_USERNAME)
        .order_by("username")
        .values_list("username", flat=True)
        .iterator()
    )

    results = celery.group(
        [
            subscribe_user_range_to_channels.si(
                channel_names=channel_names, usernames=usernames
            )
            for usernames in chunks(query, chunk_size=chunk_size)
        ]
    )

    raise self.replace(results)


@app.task
def subscribe_user_range_to_channels(*, channel_names, usernames):
    """
    Subscribes a range of user ids to a set of channels

    Args:
        channel_names (list of str): the names of the channels to subscribe to
        usernames (list of str): list of user usernames
    """
    admin_api = get_admin_api()
    # walk the usernames and add them as subscribers
    for username in usernames:
        for channel_name in channel_names:
            try:
                admin_api.add_subscriber(username, channel_name)
            except Exception:  # pylint: disable=broad-except
                log.exception(
                    "Failed to subscribe username '%s' to channel '%s'",
                    username,
                    channel_name,
                )


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


@app.task
def maybe_repair_post_in_host_listing(channel_name, reddit_post_id):
    """
    Repair a post on the condition that it's in the new post listing but not in the hot listing

    Args:
        channel_name(str): the channel name to search for the post in
        reddit_post_id(str): the reddit post id to check
    """
    admin_api = get_admin_api()

    limit = settings.OPEN_DISCUSSIONS_HOT_POST_REPAIR_LIMIT

    def _find_missing_submission():
        """Find the missing submission"""
        new_posts = admin_api.list_posts(channel_name, SORT_NEW_LISTING_PARAMS)
        new_posts_by_id = {post.id: post for post in islice(new_posts, limit)}
        new_posts_ids = set(new_posts_by_id.keys())

        hot_posts = admin_api.list_posts(channel_name, SORT_HOT_LISTING_PARAMS)
        hot_posts_ids = {post.id for post in islice(hot_posts, limit)}

        missing_post_ids = new_posts_ids - hot_posts_ids

        if reddit_post_id in missing_post_ids and reddit_post_id in new_posts_ids:
            return new_posts_by_id[reddit_post_id]
        return None

    # check to see if this submission existing in hot listing
    submission = _find_missing_submission()

    if submission is None:
        return

    submission.upvote()
    submission.clear_vote()

    # check again and if it's missing still, just report an error so we can investigate
    if _find_missing_submission() is not None:
        log.error(
            "Failed to repair submission %s missing from hot posts in channel %s",
            reddit_post_id,
            channel_name,
        )
    else:
        log.info(
            "Successfully repaired submission %s missing from hot posts in channel %s",
            reddit_post_id,
            channel_name,
        )


@app.task(acks_late=True)
def update_memberships_for_managed_channels(*, channel_ids=None, user_ids=None):
    """Cron task to update managed channel memberships"""
    membership_api.update_memberships_for_managed_channels(
        channel_ids=channel_ids, user_ids=user_ids
    )


@app.task(acks_late=True)
def check_post_for_spam(*, user_ip, user_agent, post_id):
    """
    Check posts for spam and remove them accordingly

    Args:
        user_ip (str): user's ip address for the request that created the post
        user_agent (str): useragent for the request that created the post
        post_id (str): reddit base36 post id
    """
    admin_api = get_admin_api()

    post = Post.objects.get(post_id=post_id)

    is_spam = SPAM_CHECKER.is_post_spam(
        user_ip=user_ip, user_agent=user_agent, post=post
    )
    save_spam_result(
        user_ip=user_ip,
        user_agent=user_agent,
        object_type=ContentType.objects.get_for_model(Post),
        object_id=post.id,
        is_spam=is_spam,
    )

    if is_spam:
        admin_api.remove_post(post.post_id)
    else:
        notify_moderators.delay(post.post_id, post.channel.name)


@app.task(acks_late=True)
def check_comment_for_spam(*, user_ip, user_agent, comment_id):
    """
    Check comments for spam and remove them accordingly

    Args:
        user_ip (str): user's ip address for the request that created the comment
        user_agent (str): useragent for the request that created the comment
        comment_id (str): reddit base36 comment id
    """
    admin_api = get_admin_api()

    comment = Comment.objects.get(comment_id=comment_id)

    is_spam = SPAM_CHECKER.is_comment_spam(
        user_ip=user_ip, user_agent=user_agent, comment=comment
    )
    save_spam_result(
        user_ip=user_ip,
        user_agent=user_agent,
        object_type=ContentType.objects.get_for_model(Comment),
        object_id=comment.id,
        is_spam=is_spam,
    )
    if is_spam:
        admin_api.remove_comment(comment.comment_id)


@app.task
def update_spam(*, spam, comment_ids, post_ids, retire_users, skip_akismet):
    """
    Updates the spam check result for comments and posts

    Args:
        spam (bool): Mark as spam if true and ham if false
        comment_ids( list of int): list of comment ids in integer form
        post_ids( list of int): list of post ids in integer for
        retire_users(bool): retire comment/post authors if true
        skip_akismet(bool): do not submit reclassification to akismet if true

    """
    comment_content_type = ContentType.objects.get_for_model(Comment)
    post_content_type = ContentType.objects.get_for_model(Post)
    admin_api = get_admin_api()

    akismet_client = create_akismet_client()

    for comment in Comment.objects.filter(id__in=comment_ids).iterator():
        result, _ = SpamCheckResult.objects.get_or_create(
            content_type=comment_content_type, object_id=comment.id
        )

        if spam:
            result.is_spam = True
            result.save()

            admin_api.remove_comment(comment.comment_id)
            submit_func = akismet_client.submit_spam

        else:
            result.is_spam = False
            result.save()

            admin_api.approve_comment(comment.comment_id)
            submit_func = akismet_client.submit_ham

        if not skip_akismet:
            submit_func(
                user_agent=result.user_agent,
                user_ip=result.user_ip,
                comment_content=comment.text,
                comment_type="reply",
                comment_author=comment.author.profile.name,
                comment_author_email=comment.author.email,
            )

        if spam and retire_users:
            retire_user(comment.author)

    for post in Post.objects.filter(id__in=post_ids).iterator():
        result, _ = SpamCheckResult.objects.get_or_create(
            content_type=post_content_type, object_id=post.id
        )

        if spam:
            result.is_spam = True
            result.save()

            admin_api.remove_post(post.post_id)
            submit_func = akismet_client.submit_spam

        else:
            result.is_spam = False
            result.save()

            admin_api.approve_post(post.post_id)
            submit_func = akismet_client.submit_ham

        if not skip_akismet:
            submit_func(
                user_agent=result.user_agent,
                user_ip=result.user_ip,
                comment_content=post.plain_text,
                comment_type="forum-post",
                comment_author=post.author.profile.name,
                comment_author_email=post.author.email,
            )

        if spam and retire_users:
            retire_user(post.author)


def retire_user(user):
    """Retire a user"""
    if user.email:
        BlockedEmailRegex.objects.create(match=user.email)
        user.email = ""
        user.is_active = False
        user.set_unusable_password()
        user.save()
        user.social_auth.all().delete()
        user.received_invitations.all().delete()
        task_helpers.deindex_profile(user)
        user.content_subscriptions.all().delete()
