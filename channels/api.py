"""Channels APIs"""
import logging
from datetime import datetime, timezone

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db.models import Q
from django.http.response import Http404
from rest_framework.exceptions import PermissionDenied, NotFound

from channels.constants import (
    CHANNEL_TYPE_PUBLIC,
    POSTS_SORT_HOT,
    POSTS_SORT_NEW,
    POSTS_SORT_TOP,
    VALID_POST_SORT_TYPES,
    VALID_COMMENT_SORT_TYPES,
    LINK_TYPE_LINK,
    LINK_TYPE_SELF,
    EXTENDED_POST_TYPE_ARTICLE,
)
from channels.models import (
    Channel,
    Comment,
    Post,
    Subscription,
    ChannelSubscription,
)
from channels.proxies import (
    PostProxy,
    ChannelProxy,
    CommentProxy,
    proxy_post,
    proxy_channel,
    proxy_channels,
    proxy_posts,
)

User = get_user_model()
log = logging.getLogger()


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
    from channels.utils import num_items_not_none

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
        # In the original code:
        # if self.user.is_anonymous:
        #     subreddits = self.reddit.subreddits.default()
        # else:
        #     subreddits = self.reddit.user.subreddits(limit=None)
        
        # For read-only archive, maybe just list all public channels?
        # Or list channels the user is subscribed to if logged in?
        
        if self.user.is_anonymous:
             channels = Channel.objects.filter(channel_type=CHANNEL_TYPE_PUBLIC)
        else:
            # List subscribed channels + public ones? 
            # Original behavior for logged in user was "subreddits the user is subscribed to"
            channels = Channel.objects.filter(
                id__in=ChannelSubscription.objects.filter(user=self.user).values("channel_id")
            )
            
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
        raise PermissionDenied("Read-only mode")

    def update_channel(self, *args, **kwargs):
        raise PermissionDenied("Read-only mode")

    def create_post(self, *args, **kwargs):
        raise PermissionDenied("Read-only mode")

    def update_post(self, *args, **kwargs):
        raise PermissionDenied("Read-only mode")
        
    def delete_post(self, *args, **kwargs):
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

    def list_user_comments(self, username, listing_params):
        """List comments submitted by a given user"""
        # This returns a listing of comments
        queryset = Comment.objects.filter(author__username=username, removed=False, deleted=False)
        # We need a _get_comment_listing?
        # _get_listing returns PostProxies usually.
        # Let's adapt _get_listing to handle comments too or make a new one.
        return self._get_listing(queryset, listing_params, is_posts=False)

    def _get_listing(self, queryset, listing_params, is_posts=True):
        """
        List posts/comments using the 'hot' algorithm (or others)
        """
        before, after, count, sort = listing_params
        
        # Sorting is handled in utils.get_pagination_and_reddit_obj_list usually?
        # No, that function takes a generator.
        # Here we are returning a generator or list?
        # The original API returned a ListingGenerator.
        # Our views expect something that can be passed to get_pagination_and_reddit_obj_list.
        # In our new utils.py, get_pagination_and_reddit_obj_list takes a queryset.
        # So we should just return the queryset here, but with sort applied?
        # utils.get_pagination_and_reddit_obj_list applies sort and limit.
        
        # However, the view calls:
        # paginated_posts = api.list_posts(...)
        # pagination, posts = get_pagination_and_reddit_obj_list(paginated_posts, listing_params)
        
        # So list_posts should return a queryset.
        
        if sort not in VALID_POST_SORT_TYPES and is_posts:
             raise ValueError("Sort method '{}' is not supported".format(sort))
             
        # We defer sorting/slicing to get_pagination_and_reddit_obj_list in utils
        # But we can apply some default ordering here to ensure consistency
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
        Lists the comments of a post_id
        """
        if sort not in VALID_COMMENT_SORT_TYPES:
            raise ValueError(
                "Sort method '{}' is not supported for comments".format(sort)
            )

        # This is expected to return a CommentForest-like object or a list of comments.
        # The serializer (CommentSerializer) doesn't seem to iterate over it?
        # Wait, Post.comments in PRAW returns a CommentForest.
        # In views/comments.py (not checked yet, but likely exists), it probably iterates.
        
        # Let's check how it's used.
        # In the original code: return post.comments
        
        # We need to return top-level comments for the post.
        comments = Comment.objects.filter(post__post_id=post_id, parent_id__isnull=True).order_by("-score")
        return [CommentProxy(c) for c in comments]

    def more_comments(self, parent_id, post_id, children, sort):
        """
        Fetches data for a comment and its children
        """
        # This is used to expand "more comments" links.
        # children is a list of comment IDs.
        
        comments = Comment.objects.filter(comment_id__in=children)
        return [CommentProxy(c) for c in comments]

    # Read-only stubs for other methods
    def add_contributor(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    def remove_contributor(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    def add_moderator(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    def remove_moderator(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    def add_subscriber(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    def remove_subscriber(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    def report_post(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    def report_comment(self, *args, **kwargs): raise PermissionDenied("Read-only mode")
    
    def is_subscriber(self, subscriber_name, channel_name):
        try:
            user = User.objects.get(username=subscriber_name)
            return ChannelSubscription.objects.filter(user=user, channel__name=channel_name).exists()
        except User.DoesNotExist:
            return False

    def is_moderator(self, channel_name, moderator_name):
        # Check local DB roles
        # We have ChannelGroupRole
        from channels.models import ChannelGroupRole
        from channels.constants import ROLE_MODERATORS
        
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
        # Return empty list or implement if needed
        return []

    def list_moderators(self, channel_name):
        # Return empty list or implement if needed
        return []
        
    def list_reports(self, channel_name):
        return []

    def add_post_subscription(self, post_id):
        # Allow subscriptions locally? Or read-only?
        # Plan says "remove all integration with Reddit".
        # Local subscriptions are fine if they don't sync to Reddit.
        # But for now, let's make it read-only to be safe/simple.
        raise PermissionDenied("Read-only mode")

    def remove_post_subscription(self, post_id):
        raise PermissionDenied("Read-only mode")

    def add_comment_subscription(self, post_id, comment_id):
        raise PermissionDenied("Read-only mode")

    def remove_comment_subscription(self, post_id, comment_id):
        raise PermissionDenied("Read-only mode")
        
    def apply_post_vote(self, *args, **kwargs):
        # No voting
        return False
        
    def apply_comment_vote(self, *args, **kwargs):
        # No voting
        return False

