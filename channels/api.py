"""Channels APIs"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, NotFound

from channels.constants import (
    CHANNEL_TYPE_PUBLIC,
    POSTS_SORT_HOT,
    POSTS_SORT_NEW,
    POSTS_SORT_TOP,
    VALID_COMMENT_SORT_TYPES,
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
    EXTENDED_POST_TYPE_ARTICLE,
    ROLE_CONTRIBUTORS,
    ROLE_MODERATORS,
)
from channels.models import (
    Channel,
    Comment,
    Post,
    ChannelSubscription,
    ChannelGroupRole,
)
from channels.proxies import (
    CommentProxy,
    proxy_post,
    proxy_channel,
    proxy_channels,
)
from channels.utils import num_items_not_none

User = get_user_model()
log = logging.getLogger()


def sync_channel_subscription_model(channel_name, user):
    """
    Create or update channel subscription for a user

    Args:
        channel_name (str): The name of the channel
        user (django.contrib.models.auth.User): The user

    Returns:
        ChannelSubscription: the channel user role object
    """
    from django.db import transaction

    with transaction.atomic():
        channel = Channel.objects.get(name=channel_name)
        return ChannelSubscription.objects.update_or_create(channel=channel, user=user)[0]


def get_role_model(channel, role):
    """
    Get a ChannelGroupRole object

    Args:
        channel(channels.models.Channel): The channel
        role(str): The role name (moderators, contributors)

    Returns:
        ChannelGroupRole: the ChannelGroupRole object
    """
    return ChannelGroupRole.objects.get(channel=channel, role=role)


def add_user_role(channel, role, user):
    """
    Add a user to a channel role's group

    Args:
        channel(channels.models.Channel): The channel
        role(str): The role name (moderators, contributors)
        user(django.contrib.auth.models.User): The user
    """
    get_role_model(channel, role).group.user_set.add(user)


def allowed_post_types_bitmask(allowed_post_types):
    """
    Returns a bitmask for the post types

    Args:
        allowed_post_types (list of str): list of allowed post types

    Returns:
        int: bit mask for the allowed post types
    """
    import operator
    from functools import reduce

    return reduce(
        operator.or_,
        [
            bit
            for post_type, bit in Channel.allowed_post_types.items()
            if post_type in allowed_post_types
        ],
        0,
    )


def get_allowed_post_types_from_link_type(link_type):
    """
    Determine allowed_post_types based on a value for reddit's link_type setting

    Args:
        link_type (str): the link type or None

    Returns:
        list of str: list of allowed post types
    """
    if link_type in [LINK_TYPE_LINK, LINK_TYPE_SELF]:
        return [link_type]
    else:
        # ANY or enforce a standard default
        return [LINK_TYPE_LINK, LINK_TYPE_SELF]


def get_admin_api():
    """
    Creates an instance of the API configured with the admin user

    Returns:
        channels.api.Api: Api instance configured for the admin user
    """
    admin_user = User.objects.get(username=settings.INDEXING_API_USERNAME)
    return Api(admin_user)


def get_post_type(*, text, url, article_content):
    """
    Returns the post type given the passed input values

    Args:
        text (str or None): the post text
        url (str): the post url
        article_content (dict): the post article text data
    Returns:
        str: the type of post
    Raises:
        ValueError: If incompatible pieces of content are being submitted (e.g.: a URL is
            being submitted for a text post)
    """
    if not any([text, url, article_content]):
        # title-only text post
        return LINK_TYPE_SELF

    if num_items_not_none([text, url, article_content]) != 1:
        raise ValueError(
            "Not more than one of text, url, or article_content can be provided"
        )

    if url is not None:
        return LINK_TYPE_LINK
    elif article_content is not None:
        return EXTENDED_POST_TYPE_ARTICLE
    return LINK_TYPE_SELF


class Api:
    """Channel API"""

    def __init__(self, user):
        """Constructor"""
        if user is None:
            user = AnonymousUser()
        self.user = user

    def list_channels(self):
        """
        List the channels
        """
        if self.user.is_anonymous:
            channels = Channel.objects.filter(channel_type=CHANNEL_TYPE_PUBLIC)
        else:
            channels = Channel.objects.filter(
                Q(id__in=ChannelSubscription.objects.filter(user=self.user).values("channel_id")) |
                Q(channel_type=CHANNEL_TYPE_PUBLIC)
            ).distinct()

        return proxy_channels(channels)

    def get_channel(self, name):
        """
        Get the channel
        """
        try:
            channel = Channel.objects.get(name=name)
            return proxy_channel(channel)
        except Channel.DoesNotExist:
            raise NotFound(f"Channel {name} does not exist")

    def create_channel(self, *args, **kwargs):
        """Create a channel - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def update_channel(self, *args, **kwargs):
        """Update a channel - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def create_post(self, *args, **kwargs):
        """Create a post - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def update_post(self, *args, **kwargs):
        """Update a post - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def delete_post(self, *args, **kwargs):
        """Delete a post - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def front_page(self, listing_params):
        """
        List posts on front page
        """
        # Original: self.reddit.front
        # This usually means posts from subscribed subreddits.

        queryset = Post.objects.filter(removed=False, deleted=False)

        if not self.user.is_anonymous:
            # Filter by subscribed channels
            subscribed_channels = ChannelSubscription.objects.filter(user=self.user).values("channel_id")
            queryset = queryset.filter(channel__in=subscribed_channels)

        return self._get_listing(queryset, listing_params)

    def list_posts(self, channel_name, listing_params):
        """
        List posts for a channel
        """
        try:
            channel = Channel.objects.get(name=channel_name)
        except Channel.DoesNotExist:
            raise NotFound(f"Channel {channel_name} does not exist")

        queryset = Post.objects.filter(channel=channel, removed=False, deleted=False)
        return self._get_listing(queryset, listing_params)

    def list_user_posts(self, username, listing_params):
        """List posts submitted by a given user"""
        queryset = Post.objects.filter(author__username=username, removed=False, deleted=False)
        return self._get_listing(queryset, listing_params)

    def list_user_comments(self, username, _listing_params):
        """List comments submitted by a given user"""
        queryset = Comment.objects.filter(author__username=username, removed=False, deleted=False)
        return queryset

    def _get_listing(self, queryset, _listing_params):
        """
        Returns a queryset for posts - sorting and pagination handled by utils
        """
        return queryset

    def get_post(self, post_id):
        """
        Gets the post
        """
        try:
            post = Post.objects.get(post_id=post_id)
            return proxy_post(post)
        except Post.DoesNotExist:
            raise NotFound(f"Post {post_id} does not exist")

    def get_comment(self, comment_id):
        """
        Gets the comment
        """
        try:
            comment = Comment.objects.get(comment_id=comment_id)
            return CommentProxy(comment)
        except Comment.DoesNotExist:
            raise NotFound(f"Comment {comment_id} does not exist")

    def list_comments(self, post_id, sort):
        """
        Lists the comments of a post_id with full tree structure
        """
        if sort not in VALID_COMMENT_SORT_TYPES:
            raise ValueError(
                "Sort method '{}' is not supported for comments".format(sort)
            )

        # Fetch all comments for the post
        all_comments = Comment.objects.filter(post__post_id=post_id).select_related('author', 'post')

        # Build a map of comment_id -> CommentProxy
        comment_map = {}
        for comment in all_comments:
            proxy = CommentProxy(comment)
            comment_map[comment.comment_id] = proxy

        # Build the tree structure by attaching replies to their parents
        top_level = []
        for comment in all_comments:
            proxy = comment_map[comment.comment_id]
            if comment.parent_id is None:
                # Top-level comment
                top_level.append(proxy)
            else:
                # Reply to another comment
                if comment.parent_id in comment_map:
                    parent_proxy = comment_map[comment.parent_id]
                    parent_proxy._replies.append(proxy)

        # Sort top-level comments
        if sort == "top":
            top_level.sort(key=lambda c: c._self_comment.score, reverse=True)
        elif sort == "new":
            top_level.sort(key=lambda c: c._self_comment.created_on, reverse=True)
        else:
            top_level.sort(key=lambda c: c._self_comment.score, reverse=True)

        return top_level

    def more_comments(self, _parent_id, _post_id, children, sort):
        """
        Fetches data for a comment and its children
        """
        if not children:
            return []

        if sort not in VALID_COMMENT_SORT_TYPES:
            raise ValueError(
                "Sort method '{}' is not supported for comments".format(sort)
            )

        comments = Comment.objects.filter(comment_id__in=children).select_related('author', 'post')
        proxies = [CommentProxy(c) for c in comments]

        # Sort based on sort parameter
        if sort == "top":
            proxies.sort(key=lambda c: c._self_comment.score, reverse=True)
        elif sort == "new":
            proxies.sort(key=lambda c: c._self_comment.created_on, reverse=True)
        else:
            proxies.sort(key=lambda c: c._self_comment.score, reverse=True)

        return proxies

    def add_contributor(self, *args, **kwargs):
        """Add a contributor - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def remove_contributor(self, *args, **kwargs):
        """Remove a contributor - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def add_moderator(self, *args, **kwargs):
        """Add a moderator - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def remove_moderator(self, *args, **kwargs):
        """Remove a moderator - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def add_subscriber(self, *args, **kwargs):
        """Add a subscriber - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def remove_subscriber(self, *args, **kwargs):
        """Remove a subscriber - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def report_post(self, *args, **kwargs):
        """Report a post - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def report_comment(self, *args, **kwargs):
        """Report a comment - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def is_subscriber(self, subscriber_name, channel_name):
        """Check if a user is subscribed to a channel"""
        try:
            user = User.objects.get(username=subscriber_name)
            return ChannelSubscription.objects.filter(user=user, channel__name=channel_name).exists()
        except User.DoesNotExist:
            return False

    def is_moderator(self, channel_name, moderator_name):
        """Check if a user is a moderator of a channel"""
        try:
            user = User.objects.get(username=moderator_name)
            channel = Channel.objects.get(name=channel_name)
            return ChannelGroupRole.objects.filter(
                channel=channel,
                role=ROLE_MODERATORS,
                group__user=user
            ).exists()
        except (User.DoesNotExist, Channel.DoesNotExist):
            return False

    def list_contributors(self, channel_name):
        """List contributors for a channel"""
        try:
            channel = Channel.objects.get(name=channel_name)
            role = ChannelGroupRole.objects.get(channel=channel, role=ROLE_CONTRIBUTORS)
            return list(role.group.user_set.all())
        except (Channel.DoesNotExist, ChannelGroupRole.DoesNotExist):
            return []

    def list_moderators(self, channel_name):
        """List moderators for a channel"""
        try:
            channel = Channel.objects.get(name=channel_name)
            role = ChannelGroupRole.objects.get(channel=channel, role=ROLE_MODERATORS)
            return list(role.group.user_set.all())
        except (Channel.DoesNotExist, ChannelGroupRole.DoesNotExist):
            return []

    def list_reports(self, _channel_name):
        """List reports for a channel - always returns empty in read-only mode"""
        return []

    def add_post_subscription(self, post_id):
        """Add a post subscription - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def remove_post_subscription(self, post_id):
        """Remove a post subscription - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def add_comment_subscription(self, post_id, comment_id):
        """Add a comment subscription - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def remove_comment_subscription(self, post_id, comment_id):
        """Remove a comment subscription - disabled in read-only mode"""
        raise PermissionDenied("Read-only mode")

    def apply_post_vote(self, *args, **kwargs):
        """Apply a vote to a post - disabled in read-only mode"""
        return False

    def apply_comment_vote(self, *args, **kwargs):
        """Apply a vote to a comment - disabled in read-only mode"""
        return False
