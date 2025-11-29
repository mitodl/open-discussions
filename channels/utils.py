"""Utils for channels"""
from collections import namedtuple
from contextlib import contextmanager

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.functional import SimpleLazyObject
from django.utils.text import slugify
from rest_framework.exceptions import NotAuthenticated, NotFound, PermissionDenied

from channels.constants import POSTS_SORT_HOT, POSTS_SORT_NEW, POSTS_SORT_TOP
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


def get_pagination_and_reddit_obj_list(queryset, listing_params):
    """
    Creates pagination data

    Args:
        queryset (django.db.models.query.QuerySet):
            queryset of objects (posts, comments, etc.)
        listing_params (ListingParams): listing params for this page

    Returns:
        (dict, list of objects): pagination and object list
    """
    before, after, count, sort = listing_params
    limit = settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT
    
    # Apply sort
    if sort == POSTS_SORT_NEW:
        queryset = queryset.order_by("-created_on")
    elif sort == POSTS_SORT_TOP:
        queryset = queryset.order_by("-score")
    else: # HOT or default
        # Fallback to score for hot
        queryset = queryset.order_by("-score")

    # Simple pagination: just return the first page for now as we are removing Reddit integration
    # and full cursor pagination implementation is out of scope for "minimal changes"
    objects = list(queryset[:limit])
    pagination = {"sort": sort}
    
    return pagination, objects


@contextmanager
def translate_praw_exceptions(user):
    """
    No-op context manager since PRAW is removed.
    """
    yield


def lookup_users_for_posts(posts):
    """
    Helper function to look up user for each instance and attach it to instance.user

    Args:
        posts (list of channels.models.Post):
            A list of posts

    Return:
        dict: A map of usernames to the corresponding User object
    """
    # posts are now Post models, so author is a User object
    usernames = []
    for post in posts:
        if post.author:
            usernames.append(post.author.username)
            
    users = User.objects.filter(
        username__in=usernames
    ).select_related("profile")
    return {user.username: user for user in users}


def _lookup_subscriptions_for_posts(posts, user):
    """
    Helper function to look up the user's subscriptions among a set of posts

    Args:
        posts (list of channels.models.Post):
            A list of posts
        user (User):
            The user to find post subscriptions for

    Return:
        list of str: list of base36 ids of posts the user is subscribed to
    """
    from channels.models import Subscription

    if not posts or user.is_anonymous:
        return []

    # posts are Post models, so use post.post_id (Base36 encoded int, but stored as int in DB? No, Base36IntegerField)
    # Base36IntegerField stores as int in DB, but access as string?
    # channels/models.py: Base36IntegerField(models.BigIntegerField)
    # It converts to/from base36 string in python.
    # So post.post_id is a string (base36).
    # Subscription.post_id is also Base36IntegerField.
    
    # We need to pass the integer values to the filter if we are filtering on the DB column directly?
    # Or does Django handle it?
    # Base36IntegerField.get_prep_value converts to int.
    # So filtering with base36 strings should work.
    
    return Subscription.objects.filter(
        user=user, post_id__in=[post.post_id for post in posts], comment_id__isnull=True
    ).values_list("post_id", flat=True)


def lookup_subscriptions_for_posts(posts, user):
    """
    Helper function to look up the user's subscriptions among a set of posts
    """
    return SimpleLazyObject(lambda: _lookup_subscriptions_for_posts(posts, user))


def _lookup_subscriptions_for_comments(comments, user):
    """
    Helper function to look up the user's subscriptions among a set of comments
    """
    from channels.models import Subscription

    if not comments or user.is_anonymous:
        return []

    # comments are Comment models (or proxies?)
    # If they are Comment models:
    post_id = comments[0].post.post_id
    comment_ids = [comment.comment_id for comment in comments]

    return Subscription.objects.filter(
        user=user, post_id=post_id, comment_id__in=comment_ids
    ).values_list("comment_id", flat=True)


def lookup_subscriptions_for_comments(comments, user):
    """
    Helper function to look up the user's subscriptions among a set of comments
    """
    return SimpleLazyObject(lambda: _lookup_subscriptions_for_comments(comments, user))


def get_kind_mapping():
    """
    Get a mapping of kinds
    """
    return {"comment": "t1", "submission": "t3"}


def get_reddit_slug(permalink):
    """
    Get the reddit slug from a submission permalink, with '_' replaced by '-'
    """
    return list(filter(None, permalink.split("/")))[-1].replace("_", "-")


@transaction.atomic
def get_or_create_link_meta(url):
    """
    Gets (and if necessary creates) a LinkMeta object for a URL
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
    """
    return len(list(filter(lambda val: val is not None, items)))


def _render_article_nodes(node):
    """
    Render article nodes into pieces of text
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
    """
    return "".join(_render_article_nodes(content))


def reddit_slugify(text, max_length=50):
    """
    Slugifies a piece of text in the same manner reddit would
    """
    text = slugify(text).replace("-", "_").lower()

    while len(text) > max_length:
        before, _, after = text.rpartition("_")
        if before:
            text = before
        else:
            text = after
            break

    return text[:max_length] or "_"
