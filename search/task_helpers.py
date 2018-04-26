"""
Functions that execute search-related asynchronous tasks
"""
import logging
from functools import wraps, partial

from open_discussions.features import (
    INDEX_UPDATES,
    if_feature_enabled,
)
from channels.constants import (
    POST_TYPE,
    VoteActions,
)
from search.indexing_api import gen_post_id
from search.serializers import serialize_post
from search.tasks import (
    create_document,
    update_document_with_partial,
    increment_document_integer_field,
)

log = logging.getLogger()


def reddit_object_indexer(indexing_func=None):
    """
    Decorator that passes a PRAW object to a function that will perform some indexing action.
    The decorated function must return a PRAW object
    (e.g.: praw.models.reddit.submission.Submission, praw.models.reddit.comment.Comment)
    """
    def api_indexing_listener_inner(func):  # pylint: disable=missing-docstring
        @wraps(func)
        def wrapped_api_func(*args, **kwargs):  # pylint: disable=missing-docstring
            reddit_obj = func(*args, **kwargs)
            try:
                indexing_func(reddit_obj)
            except Exception:  # pylint: disable=broad-except
                log.exception('Error occurred while trying to serialize and index PRAW object')
            return reddit_obj
        return wrapped_api_func
    return api_indexing_listener_inner


@if_feature_enabled(INDEX_UPDATES)
def index_full_post(post_obj):
    """
    Serializes a post object and runs a task to create an ES document for it.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    data = serialize_post(post_obj)
    return create_document.delay(
        gen_post_id(post_obj.id),
        data
    )


@if_feature_enabled(INDEX_UPDATES)
def update_post_text(post_obj):
    """
    Serializes post object text and runs a task to update the text for the associated ES document.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    return update_document_with_partial.delay(
        gen_post_id(post_obj.id),
        {'text': post_obj.selftext}
    )


@if_feature_enabled(INDEX_UPDATES)
def update_post_removal_status(post_obj):
    """
    Serializes the removal status for a post object and runs a task to update that status
    for the associated ES document.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    return update_document_with_partial.delay(
        gen_post_id(post_obj.id),
        {'removed': bool(post_obj.banned_by) and not post_obj.approved_by}
    )


@if_feature_enabled(INDEX_UPDATES)
def _update_post_comment_count(comment_obj, incr_amount=1):
    """
    Updates the comment count for a post object (retrieved via a comment object)
    and runs a task to update that count for the associated ES document.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
        incr_amount (int): The amount to increment to count
    """
    post_obj = comment_obj.submission
    return increment_document_integer_field.delay(
        gen_post_id(post_obj.id),
        field_name='num_comments',
        incr_amount=incr_amount
    )


increment_post_comment_count = partial(_update_post_comment_count, incr_amount=1)
decrement_post_comment_count = partial(_update_post_comment_count, incr_amount=-1)


@if_feature_enabled(INDEX_UPDATES)
def update_indexed_score(instance, instance_type, vote_action):
    """
    Serializes the score for a PRAW object (comment or post) and runs a task to update
    that score for the associated ES document.

    Args:
        instance: A PRAW Comment or Submission (a.k.a. post) object
        instance_type (str): A string indicating the type of object being passed in
        vote_action (VoteActions): A value indicating what kind of vote action was taken
    """
    if vote_action in (VoteActions.UPVOTE, VoteActions.CLEAR_DOWNVOTE):
        vote_increment = 1
    elif vote_action in (VoteActions.DOWNVOTE, VoteActions.CLEAR_UPVOTE):
        vote_increment = -1
    else:
        raise ValueError('Received an invalid vote action value: %s', vote_action)

    if instance_type != POST_TYPE:
        return
    return increment_document_integer_field.delay(
        gen_post_id(instance.id),
        field_name='score',
        incr_amount=vote_increment
    )
