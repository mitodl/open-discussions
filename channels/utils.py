"""Utils for channels"""
from contextlib import contextmanager

from django.conf import settings
from django.contrib.auth import get_user_model
from praw.exceptions import APIException
from prawcore.exceptions import (
    Forbidden,
    NotFound as PrawNotFound,
    Redirect,
)
from rest_framework.exceptions import PermissionDenied, NotFound

from channels.exceptions import ConflictException

User = get_user_model()


def get_pagination_params(request):
    """
    Extracts pagination params from a request

    Args:
        request: API request object

    Returns:
        (before, after, count): pagination params
    """
    after = request.query_params.get('after', None)
    before = request.query_params.get('before', None)
    count = int(request.query_params.get('count', 0))
    return before, after, count


def get_pagination_and_posts(posts, before=None, count=None):
    """
    Creates pagination data

    Args:
        posts (praw.models.listing.generator.ListingGenerator): listing generator for posts
        before (str): fullname of the first post on the next page
        count (int): number of posts seen so far

    Returns:
        (dict, list of praw.models.Submission): pagination and post data
    """
    pagination = {}

    # call _next_batch() so it pulls data
    # pylint: disable=protected-access
    try:
        posts._next_batch()
    except StopIteration:
        # empty page
        return {}, []

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
