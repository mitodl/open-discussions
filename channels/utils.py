"""Utils for channels"""
from collections import namedtuple
from contextlib import contextmanager

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.functional import SimpleLazyObject
from praw.exceptions import APIException
from praw.models import Comment
from prawcore.exceptions import (
    Forbidden,
    NotFound as PrawNotFound,
    Redirect,
)
from rest_framework.exceptions import PermissionDenied, NotFound

from channels.constants import POSTS_SORT_HOT
from channels.exceptions import ConflictException, GoneException
from channels.models import Subscription

User = get_user_model()

ListingParams = namedtuple('ListingParams', ['before', 'after', 'count', 'sort'])

DEFAULT_LISTING_PARAMS = ListingParams(None, None, 0, POSTS_SORT_HOT)


def get_listing_params(request):
    """
    Extracts listing params from a request

    Args:
        request: API request object

    Returns:
        (ListingParams): pagination params
    """
    before = request.query_params.get('before', None)
    after = request.query_params.get('after', None)
    count = int(request.query_params.get('count', 0))
    sort = request.query_params.get('sort', POSTS_SORT_HOT)
    return ListingParams(before, after, count, sort)


def get_pagination_and_posts(posts, listing_params):
    """
    Creates pagination data

    Args:
        posts (praw.models.listing.generator.ListingGenerator): listing generator for posts
        listing_params (ListingParams): listing params for this page

    Returns:
        (dict, list of praw.models.Submission): pagination and post data
    """
    before, _, count, _ = listing_params
    pagination = {
        'sort': listing_params.sort,
    }

    # call _next_batch() so it pulls data
    # pylint: disable=protected-access
    try:
        posts._next_batch()
    except StopIteration:
        # empty page
        return pagination, []

    # pylint: disable=protected-access
    listing = posts._listing

    per_page = settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT
    count = count or 0

    if before:
        # we're paging forwards and need to offset the count to what it should be relative to the page before this
        count = count - per_page - 1

    if listing.before is not None:
        pagination['before'] = listing.before
        pagination['before_count'] = count + 1

    if listing.after is not None:
        pagination['after'] = listing.after
        pagination['after_count'] = count + per_page

    # NOTE: list(posts) can return duplicates, so we use the internal listing instead
    return pagination, list(listing)


@contextmanager
def translate_praw_exceptions():
    """Convert PRAW exceptions to DRF ones"""
    try:
        yield
    except Forbidden as exc:
        raise PermissionDenied() from exc
    except PrawNotFound as exc:
        raise NotFound() from exc
    except Redirect as exc:
        # This assumes all redirects are due to missing subreddits,
        # but I haven't seen any other causes for redirects
        raise NotFound() from exc
    except APIException as exc:
        if exc.error_type in ('SUBREDDIT_NOTALLOWED', 'NOT_AUTHOR'):
            raise PermissionDenied() from exc
        elif exc.error_type == 'SUBREDDIT_NOEXIST':
            raise NotFound() from exc
        elif exc.error_type == 'SUBREDDIT_EXISTS':
            raise ConflictException() from exc
        elif exc.error_type == 'DELETED_COMMENT':
            raise GoneException() from exc
        raise


def lookup_users_for_posts(posts):
    """
    Helper function to look up user for each instance and attach it to instance.user

    Args:
        posts (list of praw.models.Submission):
            A list of submissions
    """
    users = User.objects.filter(
        username__in=[
            post.author.name for post in posts if post.author
        ]
    ).select_related('profile')
    return {user.username: user for user in users}


def _lookup_subscriptions_for_posts(posts, user):
    """
    Helper function to look up the user's subscriptions among a set of posts

    Args:
        posts (list of praw.models.Submission):
            A list of posts
        user (User):
            The user to find post subscriptions for

    Return:
        list of str: list of base36 ids of posts the user is subscribed to
    """
    if not posts:
        return []

    return Subscription.objects.filter(
        user=user,
        post_id__in=[post.id for post in posts],
        comment_id__isnull=True,
    ).values_list('post_id', flat=True)


def lookup_subscriptions_for_posts(posts, user):
    """
    Helper function to look up the user's subscriptions among a set of posts

    Args:
        posts (list of praw.models.Submission):
            A list of posts
        user (User):
            The user to find post subscriptions for

    Return:
        list of str: list of base36 ids of posts the user is subscribed to
    """
    return SimpleLazyObject(lambda: _lookup_subscriptions_for_posts(posts, user))


def _lookup_subscriptions_for_comments(comments, user):
    """
    Helper function to look up the user's subscriptions among a set of comments

    Args:
        comments (list of praw.models.Comment):
            A list of comments
        user (User):
            The user to find comments for

    Return:
        list of int: list of integer ids of comments the user is subscribed to
    """
    if not comments or user.is_anonymous:
        return []

    post_id = comments[0]._extract_submission_id()  # pylint: disable=protected-access

    comment_ids = [comment.id for comment in comments if isinstance(comment, Comment)]

    return Subscription.objects.filter(
        user=user,
        post_id=post_id,
        comment_id__in=comment_ids,
    ).values_list('comment_id', flat=True)


def lookup_subscriptions_for_comments(comments, user):
    """
    Helper function to look up the user's subscriptions among a set of comments

    Args:
        comments (list of praw.models.Comment):
            A list of comments
        user (User):
            The user to find comments for

    Return:
        list of int: list of integer ids of comments the user is subscribed to
    """
    return SimpleLazyObject(lambda: _lookup_subscriptions_for_comments(comments, user))
