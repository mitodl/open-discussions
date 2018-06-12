"""Serializers for elasticsearch data"""
from django.contrib.auth import get_user_model

from channels.constants import (
    POST_TYPE,
    COMMENT_TYPE,
)
from search.api import (
    get_reddit_object_type,
    gen_post_id,
    gen_comment_id,
)

User = get_user_model()


def _get_user_from_reddit_object(reddit_obj):
    """
    Gets the User that corresponds to a given reddit object

    Args:
        reddit_obj (praw.models.Submission|praw.models.Comment):
            A post or comment object

    Returns:
        User|None: A User object (or None if author information is missing from the instance)
    """
    if reddit_obj.author is None:
        return None
    else:
        return User.objects.filter(username=reddit_obj.author.name).select_related('profile').first()


def serialize_post(post_obj):
    """
    Serialize a reddit Submission

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    author_user = _get_user_from_reddit_object(post_obj)
    author_name = author_user.profile.name if author_user else None
    return {
        'object_type': POST_TYPE,
        'author_id': post_obj.author.name if post_obj.author else None,
        'author_name': author_name,
        'channel_title': post_obj.subreddit.display_name,
        'text': post_obj.selftext,
        'score': post_obj.score,
        'created': post_obj.created,
        'post_id': post_obj.id,
        'post_title': post_obj.title,
        'num_comments': post_obj.num_comments,
    }


def serialize_comment(comment_obj):
    """
    Serialize a comment

    Args:
        comment_obj (Comment): A PRAW comment
    """
    author_user = _get_user_from_reddit_object(comment_obj)
    author_name = author_user.profile.name if author_user else None

    post_obj = comment_obj.submission
    parent_comment = comment_obj.parent()
    parent_comment_id = None if get_reddit_object_type(parent_comment) != COMMENT_TYPE else parent_comment.id

    return {
        'object_type': COMMENT_TYPE,
        'author_id': comment_obj.author.name if comment_obj.author else None,
        'author_name': author_name,
        'channel_title': comment_obj.subreddit.display_name,
        'text': comment_obj.body,
        'score': comment_obj.score,
        'created': comment_obj.created,
        'post_id': post_obj.id,
        'post_title': post_obj.title,
        'comment_id': comment_obj.id,
        'parent_comment_id': parent_comment_id,
    }


def _serialize_comment_tree_for_bulk(comments):
    """
    Serialize an iterable of Comment and their replies for a bulk API request

    Args:
        comments (iterable of Comment): An iterable of comments

    Yields:
        dict: Documents suitable for indexing in Elasticsearch
    """
    for comment in comments:
        yield serialize_comment_for_bulk(comment)
        yield from _serialize_comment_tree_for_bulk(comment.replies)


def serialize_bulk_post_and_comments(post_obj):
    """
    Index comments for a post and recurse to deeper level comments for a bulk API request

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    yield serialize_post_for_bulk(post_obj)
    yield from _serialize_comment_tree_for_bulk(post_obj.comments)


def serialize_post_for_bulk(post_obj):
    """
    Serialize a reddit Submission for a bulk API request

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    return {
        '_id': gen_post_id(post_obj.id),
        **serialize_post(post_obj),
    }


def serialize_comment_for_bulk(comment_obj):
    """
    Serialize a comment for a bulk API request

    Args:
        comment_obj (Comment): A PRAW comment
    """
    return {
        '_id': gen_comment_id(comment_obj.id),
        **serialize_comment(comment_obj),
    }
