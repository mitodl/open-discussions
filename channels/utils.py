"""Utils for channels"""
from collections import namedtuple
from contextlib import contextmanager

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.functional import SimpleLazyObject
from django.utils.text import slugify
from praw.config import Config
from praw.exceptions import APIException
from praw.models import Comment
from prawcore.exceptions import Forbidden, NotFound as PrawNotFound, Redirect
from rest_framework.exceptions import NotAuthenticated, NotFound, PermissionDenied

from channels.constants import POSTS_SORT_HOT, POSTS_SORT_NEW
from channels.exceptions import ConflictException, GoneException
from embedly.api import get_embedly_summary, THUMBNAIL_URL

AVATAR_SMALL_MAX_DIMENSION = 22
AVATAR_MEDIUM_MAX_DIMENSION = 90

ImageSize = namedtuple("ImageSize", ["x", "y"])

User = get_user_model()

ListingParams = namedtuple("ListingParams", ["before", "after", "count", "sort"])

SORT_HOT_LISTING_PARAMS = ListingParams(None, None, 0, POSTS_SORT_HOT)
SORT_NEW_LISTING_PARAMS = ListingParams(None, None, 0, POSTS_SORT_NEW)
DEFAULT_LISTING_PARAMS = SORT_HOT_LISTING_PARAMS


def get_listing_params(request):
    """
    Extracts listing params from a request

    Args:
        request: API request object

    Returns:
        (ListingParams): pagination params
    """
    before = request.query_params.get("before", None)
    after = request.query_params.get("after", None)
    count = int(request.query_params.get("count", 0))
    sort = request.query_params.get("sort", POSTS_SORT_HOT)
    return ListingParams(before, after, count, sort)


def get_pagination_and_reddit_obj_list(reddit_obj_listing, listing_params):
    """
    Creates pagination data

    Args:
        reddit_obj_listing (praw.models.listing.generator.ListingGenerator):
            listing generator for reddit objects (posts, comments, etc.)
        listing_params (ListingParams): listing params for this page

    Returns:
        (dict, list of reddit objects [e.g.: praw.models.Submission]): pagination and reddit object list
    """
    before, _, count, _ = listing_params
    pagination = {"sort": listing_params.sort}

    # call _next_batch() so it pulls data
    # pylint: disable=protected-access
    try:
        reddit_obj_listing._next_batch()
    except StopIteration:
        # empty page
        return pagination, []

    # pylint: disable=protected-access
    listing = reddit_obj_listing._listing

    per_page = settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT
    count = count or 0

    if before:
        # we're paging forwards and need to offset the count to what it should be relative to the page before this
        count = count - per_page - 1

    if listing.before is not None:
        pagination["before"] = listing.before
        pagination["before_count"] = count + 1

    if listing.after is not None:
        pagination["after"] = listing.after
        pagination["after_count"] = count + per_page

    # NOTE: list(posts) can return duplicates, so we use the internal listing instead
    return (pagination, list(listing))


@contextmanager
def translate_praw_exceptions(user):
    """
    Convert PRAW exceptions to DRF exceptions.

    Args:
        user (User): The request user
    """
    try:
        yield
    except Forbidden as exc:
        if user.is_anonymous:
            raise NotAuthenticated() from exc
        raise PermissionDenied() from exc
    except PrawNotFound as exc:
        raise NotFound() from exc
    except Redirect as exc:
        # This assumes all redirects are due to missing subreddits,
        # but I haven't seen any other causes for redirects
        raise NotFound() from exc
    except APIException as exc:
        if exc.error_type in ("SUBREDDIT_NOTALLOWED", "NOT_AUTHOR"):
            raise PermissionDenied() from exc
        elif exc.error_type == "SUBREDDIT_NOEXIST":
            raise NotFound() from exc
        elif exc.error_type == "SUBREDDIT_EXISTS":
            raise ConflictException() from exc
        elif exc.error_type == "DELETED_COMMENT":
            raise GoneException() from exc
        raise


def lookup_users_for_posts(posts):
    """
    Helper function to look up user for each instance and attach it to instance.user

    Args:
        posts (list of praw.models.Submission):
            A list of submissions

    Return:
        dict: A map of usernames to the corresponding User object
    """
    users = User.objects.filter(
        username__in=[post.author.name for post in posts if post.author]
    ).select_related("profile")
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
    from channels.models import Subscription

    if not posts or user.is_anonymous:
        return []

    return Subscription.objects.filter(
        user=user, post_id__in=[post.id for post in posts], comment_id__isnull=True
    ).values_list("post_id", flat=True)


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
    from channels.models import Subscription

    if not comments or user.is_anonymous:
        return []

    post_id = comments[0]._extract_submission_id()  # pylint: disable=protected-access

    comment_ids = [comment.id for comment in comments if isinstance(comment, Comment)]

    return Subscription.objects.filter(
        user=user, post_id=post_id, comment_id__in=comment_ids
    ).values_list("comment_id", flat=True)


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


def get_kind_mapping():
    """
    Get a mapping of kinds

    Returns:
        dict: A map of the kind name to the kind prefix (ie t1)
    """
    return Config("DEFAULT").kinds


def get_reddit_slug(permalink):
    """
    Get the reddit slug from a submission permalink, with '_' replaced by '-'

    Args:
        permalink (str): reddit submission permalink

    Returns:
        str: the reddit slug for a submission
    """
    return list(filter(None, permalink.split("/")))[-1].replace("_", "-")


@transaction.atomic
def get_or_create_link_meta(url):
    """
    Gets (and if necessary creates) a LinkMeta object for a URL

    Args:
        url(str): The URL of an external link

    Returns:
        channels.models.LinkMeta: the LinkMeta object for the URL

    """
    from channels.models import LinkMeta

    link_meta = LinkMeta.objects.filter(url=url).first()
    if link_meta is None and settings.EMBEDLY_KEY:
        response = get_embedly_summary(url).json()
        if THUMBNAIL_URL in response:
            link_meta, _ = LinkMeta.objects.get_or_create(
                url=url, defaults={"thumbnail": response[THUMBNAIL_URL]}
            )
    return link_meta


def get_kind_and_id(thing_id):
    """
    Args:
      thing_id (str): a reddit thing id in the form t#_#+

    Returns:
        (str, str): a tuple of kind and id
    """
    return thing_id.split("_", 1)


def num_items_not_none(items):
    """
    Returns the count of items in the list that are not None

    Args:
        items (iterable): iterable of items to check for is not None

    Returns:
        int: count of items not None
    """

    return len(list(filter(lambda val: val is not None, items)))


def _render_article_nodes(node):
    """
    Render article nodes into pieces of text

    Args:
        node (list or dict): A node in the article content

    Yields:
        str: A string containing text from the article nodes
    """
    if isinstance(node, list):
        for item in node:
            yield from _render_article_nodes(item)
    elif isinstance(node, dict):
        should_have_spaces = node.get("name") in ("p", "li", "td", "figcaption")
        if should_have_spaces:
            yield " "
        if "text" in node:
            yield node["text"]
        if "children" in node:
            yield from _render_article_nodes(node["children"])
        if should_have_spaces:
            yield " "


def render_article_text(content):
    """
    Render article text based on the article content data structure

    Args:
        content (list or dict): The article content

    Returns:
         str: A string containing the text from the text nodes of the article
    """
    return "".join(_render_article_nodes(content))


def reddit_slugify(text, max_length=50):
    """
    Slugifies a piece of text in the same manner reddit would

    Args:
        text(str): text string to slugify
        max_length(int): optional length limit to output

    Returns:
        str: slugified and possibly truncated text
    """
    text = slugify(text).replace("-", "_").lower()

    while len(text) > max_length:
        # enforce max length on word boundaries
        # see https://docs.python.org/3/library/stdtypes.html#str.rpartition
        before, _, after = text.rpartition("_")
        if before:
            text = before
        else:
            # there's potential the first word is longer than the limit
            # so break out of the loop explicitly
            text = after
            break

    # hard truncation to max_length if it was just one long word
    return text[:max_length] or "_"
