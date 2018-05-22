"""Serializers for elasticsearch data"""
from channels.constants import (
    POST_TYPE,
    COMMENT_TYPE,
)


def _serialize_comment_tree(comments):
    """
    Serialize an iterable of Comment and their replies

    Args:
        comments (iterable of Comment): An iterable of comments

    Yields:
        dict: Documents suitable for indexing in Elasticsearch
    """
    for comment in comments:
        yield serialize_comment(comment)
        yield from _serialize_comment_tree(comment.replies)


def serialize_post_and_comments(post_obj):
    """
    Index comments for a post and recurse to deeper level comments

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    yield serialize_post(post_obj)
    yield from _serialize_comment_tree(post_obj.comments)


def serialize_post(post_obj):
    """
    Serialize a reddit Submission

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    return {
        'object_type': POST_TYPE,
        'author': post_obj.author.name,
        'channel_title': post_obj.subreddit.display_name,
        'text': post_obj.selftext,
        'score': post_obj.score,
        'created': post_obj.created,
        'post_id': post_obj.id,
        'post_title': post_obj.title,
        'num_comments': post_obj.num_comments,
    }


def get_reddit_object_type(reddit_obj):
    """Return the type of the given reddit object"""
    return COMMENT_TYPE if hasattr(reddit_obj, 'submission') else POST_TYPE


def serialize_comment(comment_obj):
    """
    Serialize a comment

    Args:
        comment_obj (Comment): A PRAW comment
    """
    post_obj = comment_obj.submission
    parent_comment = comment_obj.parent()
    parent_comment_id = None if get_reddit_object_type(parent_comment) != COMMENT_TYPE else parent_comment.id

    return {
        'object_type': COMMENT_TYPE,
        'author': comment_obj.author.name,
        'channel_title': comment_obj.subreddit.display_name,
        'text': comment_obj.body,
        'score': comment_obj.score,
        'created': comment_obj.created,
        'post_id': post_obj.id,
        'post_title': post_obj.title,
        'comment_id': comment_obj.id,
        'parent_comment_id': parent_comment_id,
    }
