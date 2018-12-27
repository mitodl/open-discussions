"""Utilities for tests"""
from urllib.parse import urlparse

from channels.models import Article, Channel
from channels.utils import get_reddit_slug
from profiles.utils import image_uri


def default_channel_response_data(channel):
    """
    Helper function. Returns a dict containing some of the data that we expect from the API given
    a channel.
    """
    channel_record = Channel.objects.get(name=channel.name)
    return {
        "title": channel.title,
        "name": channel.name,
        "description": channel.description,
        "public_description": channel.public_description,
        "channel_type": channel.channel_type,
        "user_is_contributor": True,
        "user_is_moderator": False,
        "link_type": channel.link_type,
        "membership_is_managed": False,
        "avatar": None,
        "avatar_small": None,
        "avatar_medium": None,
        "banner": None,
        "ga_tracking_id": None,
        "allowed_post_types": [
            post_type
            for post_type, enabled in channel_record.allowed_post_types
            if enabled
        ],
        "widget_list_id": channel_record.widget_list_id,
    }


def default_post_response_data(channel, post, user):
    """
    Helper function. Returns a dict containing some of the data that we expect from the API given
    a channel, post, and user.
    """
    # For some reason, the default values are different for staff and non-staff users
    if user.is_staff:
        user_dependent_defaults = {"upvoted": False, "num_reports": 0}
    else:
        user_dependent_defaults = {"upvoted": True, "num_reports": None}

    article = Article.objects.filter(post__post_id=post.id).first()

    text = post.text

    if not text and not post.url:
        text = ""

    return {
        "url": post.url,
        "url_domain": urlparse(post.url).hostname if post.url else None,
        "cover_image": None,
        "thumbnail": None,
        "text": text,
        "article_content": article.content if article is not None else None,
        "title": post.title,
        "removed": False,
        "deleted": False,
        "subscribed": False,
        "score": 1,
        "author_id": user.username,
        "id": post.id,
        "slug": get_reddit_slug(post.permalink),
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        "channel_type": channel.channel_type,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "stickied": False,
        **user_dependent_defaults,
    }


def default_comment_response_data(post, comment, user):
    """
    Helper function. Returns a dict containing some of the data that we expect from the API given
    a post, comment, and user.
    """
    # For some reason, the default values are different for staff and non-staff users
    if user.is_staff:
        user_dependent_defaults = {"num_reports": 0}
    else:
        user_dependent_defaults = {"num_reports": None}

    return {
        "author_id": user.username,
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "comment_type": "comment",
        "created": comment.created,
        "deleted": False,
        "downvoted": False,
        "edited": False,
        "id": comment.id,
        "parent_id": None,
        "post_id": post.id,
        "profile_image": image_uri(user.profile),
        "removed": False,
        "score": 1,
        "subscribed": False,
        "upvoted": False,
        "text": comment.text,
        **user_dependent_defaults,
    }


def raise_error_on_submission_fetch(mocker):
    """Raise an error if Submission._fetch() is called"""
    return mocker.patch(
        "praw.models.reddit.submission.Submission._fetch",
        side_effect=Exception("_fetch() should not be called"),
    )
