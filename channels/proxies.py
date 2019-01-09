"""Object proxies"""
from django.utils.functional import SimpleLazyObject
from wrapt import ObjectProxy

from channels.models import Channel, Post


class PostProxy(ObjectProxy):
    # pylint: disable=protected-access
    """
    Proxies properties to a Submission or a Post

    This allows properties to be proxied to the Submission unless otherwise overridden
    """

    def __init__(self, submission, post):
        """
        Args:
            submission (praw.models.reddit.submission.Submission): a PRAW submission object
            post (channels.models.Post): the post associated with the submission
        """
        # treat submission as the primary proxy target
        super().__init__(submission)
        # store the post so @property overrides can reference it
        self._self_submission = submission
        self._self_post = post

    def __eq__(self, other):
        """PostProxy equality delegates to submission and post equality checks"""
        # isinstance doesn't work here because ObjectProxy spoofs that
        if hasattr(other, "_self_submission") and hasattr(other, "_self_post"):
            # check the submission first because post may be lazy
            return (
                other._self_submission == self._self_submission
                and other._self_post == self._self_post
            )
        return False

    def __str__(self):
        """String representation"""
        return f"PostProxy for submission: {self._self_submission.id}"

    @property
    def channel(self):
        """Return the post channel"""
        return self._self_post.channel

    @property
    def link_meta(self):
        """Return the LinkMeta for this post"""
        return self._self_post.link_meta

    @property
    def post_type(self):
        """Return the post_type"""
        return self._self_post.post_type

    @property
    def article(self):
        """Return the Article for this post"""
        return self._self_post.article if hasattr(self._self_post, "article") else None

    @property
    def article_content(self):
        """Return the article content for this post"""
        return self.article.content if self.article is not None else None


def proxy_post(submission):
    """
    Helper function to proxy a submission

    Args:
        submission (praw.models.Submission): submission to proxy

    Returns:
        ProxyPost: proxied post
    """
    return PostProxy(
        submission, SimpleLazyObject(lambda: Post.objects.get(post_id=submission.id))
    )


def proxy_posts(submissions):
    """
    Helper function to proxy submissions and posts.

    Args:
        submissions (list of praw.models.Submission):
            A list of submissions

    Returns:
        list of ProxyPost: list of proxied posts
    """
    posts = {
        post.post_id: post
        for post in Post.objects.filter(
            post_id__in=[submission.id for submission in submissions]
        ).select_related("article", "link_meta", "channel")
    }
    return [
        PostProxy(submission, posts[submission.id])
        for submission in submissions
        if submission.id in posts
    ]


class ChannelProxy(ObjectProxy):
    """
    Proxies properties to a Subreddit or a Channel

    This allows properties to be proxied to the Subreddit unless otherwise overridden
    """

    def __init__(self, subreddit, channel):
        """
        Args:
            subreddit (praw.models.reddit.subreddit.Subreddit): a PRAW subreddit object
            channel (channels.models.Channel): the channel associated with the subreddit
        """
        # treat subreddit as the primary proxy target
        super().__init__(subreddit)
        # store the channel so @property overrides can reference it
        self._self_subreddit = subreddit
        self._self_channel = channel

    def __getattr__(self, name):
        """
        Avoid proxying __getattr__ but "proxy" to the wrapped object on any non-local fields
        """
        if name in (
            "allowed_post_types",
            "membership_is_managed",
            "avatar",
            "avatar_small",
            "avatar_medium",
            "ga_tracking_id",
            "banner",
            "widget_list_id",
        ):
            return getattr(self._self_channel, name)
        else:
            return getattr(self.__wrapped__, name)

    @property
    def channel(self):
        """Read-only access to the channel"""
        return self._self_channel


def proxy_channel(subreddit):
    """
    Helper function to proxy a submission

    Args:
        subreddit (praw.models.Subreddit): subreddit to proxy

    Returns:
        ChannelProxy: proxied channel
    """
    return ChannelProxy(
        subreddit,
        SimpleLazyObject(lambda: Channel.objects.get(name=subreddit.display_name)),
    )


def proxy_channels(subreddits):
    """
    Helper function to proxy submissions and posts.

    Args:
        subreddits (list of praw.models.Subreddit):
            A list of subreddits

    Returns:
        list of ChannelProxy: list of proxied channels
    """
    channels = {
        channel.name: channel
        for channel in Channel.objects.filter(
            name__in=[subreddit.display_name for subreddit in subreddits]
        )
    }
    return [
        ChannelProxy(subreddit, channels[subreddit.display_name])
        for subreddit in subreddits
        if subreddit.display_name in channels
    ]
