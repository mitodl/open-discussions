"""Utilities for tests"""
from urllib.parse import urlparse

from channels.utils import get_reddit_slug
from profiles.utils import image_uri


def default_post_response_data(channel, post, user):
    """
    Helper function. Returns a dict containing some of the data that we expect from the API given
    a channel, post, and user.
    """
    # For some reason, the default values are different for staff and non-staff users
    if user.is_staff:
        user_dependent_defaults = {
            'upvoted': False,
            'num_reports': 0
        }
    else:
        user_dependent_defaults = {
            'upvoted': True,
            'num_reports': None
        }

    return {
        'url': post.url,
        'url_domain': urlparse(post.url).hostname if post.url else None,
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        **user_dependent_defaults
    }
