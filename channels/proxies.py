"""Object proxies"""
from types import SimpleNamespace
from django.utils.functional import SimpleLazyObject
from wrapt import ObjectProxy

from channels.models import Channel, Post, Comment


class AuthorProxy:
    """Proxies a User object to look like a PRAW Redditor"""
    def __init__(self, user):
        self.user = user

    @property
    def name(self):
        return self.user.username if self.user else "[deleted]"

    def __str__(self):
        return self.name


class PostProxy(ObjectProxy):
    """
    Proxies properties to a Post model to look like a PRAW Submission
    """

    def __init__(self, post):
        """
        Args:
            post (channels.models.Post): the post
        """
        super().__init__(post)
        self._self_post = post

    def __eq__(self, other):
        """PostProxy equality"""
        if hasattr(other, "_self_post"):
            return other._self_post == self._self_post
        return False

    def __str__(self):
        """String representation"""
        return f"PostProxy for post: {self._self_post.post_id}"

    @property
    def id(self):
        return self._self_post.post_id

    @property
    def ups(self):
        return self._self_post.score

    @property
    def author(self):
        return AuthorProxy(self._self_post.author)

    @property
    def created(self):
        return self._self_post.created_on.timestamp()

    @property
    def selftext(self):
        return self._self_post.text

    @property
    def permalink(self):
        # Construct a fake permalink or use the URL if available
        # Reddit permalink format: /r/subreddit/comments/id/title/
        return f"/r/{self._self_post.channel.name}/comments/{self._self_post.post_id}/{self._self_post.slug}/"

    @property
    def subreddit(self):
        return ChannelProxy(self._self_post.channel)

    @property
    def likes(self):
        return None  # Read-only, no user specific vote status

    @property
    def banned_by(self):
        return True if self._self_post.removed else None

    @property
    def approved_by(self):
        return None

    @property
    def is_self(self):
        return self._self_post.url is None

    # Existing properties that were proxying to _self_post
    @property
    def channel(self):
        return self._self_post.channel

    @property
    def link_meta(self):
        return self._self_post.link_meta

    @property
    def post_type(self):
        return self._self_post.post_type

    @property
    def article(self):
        return self._self_post.article if hasattr(self._self_post, "article") else None

    @property
    def article_content(self):
        return self.article.content if self.article is not None else None

    @property
    def preview_text(self):
        return self._self_post.preview_text

    @property
    def removed(self):
        return self._self_post.removed


class ChannelProxy(ObjectProxy):
    """
    Proxies properties to a Channel model to look like a PRAW Subreddit
    """

    def __init__(self, channel):
        """
        Args:
            channel (channels.models.Channel): the channel
        """
        super().__init__(channel)
        self._self_channel = channel

    @property
    def display_name(self):
        return self._self_channel.name

    @property
    def subreddit_type(self):
        return self._self_channel.channel_type

    @property
    def public_description(self):
        return "" # Placeholder

    @property
    def submit_text(self):
        return "" # Placeholder

    @property
    def submit_text_label(self):
        return "" # Placeholder

    @property
    def submission_type(self):
        # Derive from allowed_post_types
        # This is an approximation as we don't store the original string
        return "any"

    @property
    def channel(self):
        """Read-only access to the channel"""
        return self._self_channel


class CommentProxy(ObjectProxy):
    """
    Proxies properties to a Comment model to look like a PRAW Comment
    """
    def __init__(self, comment):
        super().__init__(comment)
        self._self_comment = comment
        self._replies = []

    @property
    def id(self):
        return self._self_comment.comment_id

    @property
    def body(self):
        return self._self_comment.text

    @property
    def author(self):
        return AuthorProxy(self._self_comment.author)

    @property
    def created(self):
        return self._self_comment.created_on.timestamp()

    @property
    def banned_by(self):
        return True if self._self_comment.removed else None

    @property
    def approved_by(self):
        return None

    @property
    def likes(self):
        return None

    @property
    def submission(self):
        return PostProxy(self._self_comment.post)

    @property
    def subreddit(self):
        return ChannelProxy(self._self_comment.post.channel)

    @property
    def parent_id(self):
        # PRAW parent_id is prefixed with type (t1_, t3_)
        if self._self_comment.parent_id:
            return f"t1_{self._self_comment.parent_id}"
        else:
            return f"t3_{self._self_comment.post.post_id}"

    @property
    def replies(self):
        return self._replies

    def parent(self):
        # Used by serializer get_parent_id
        if self._self_comment.parent_id:
            # Return a fake object with id
            return SimpleNamespace(id=self._self_comment.parent_id)
        else:
            # Return submission
            return self.submission


def proxy_post(post):
    """Helper to proxy a post"""
    return PostProxy(post)


def proxy_posts(posts):
    """Helper to proxy posts"""
    return [PostProxy(post) for post in posts]


def proxy_channel(channel):
    """Helper to proxy a channel"""
    return ChannelProxy(channel)


def proxy_channels(channels):
    """Helper to proxy channels"""
    return [ChannelProxy(channel) for channel in channels]
