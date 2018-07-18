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
    COMMENT_TYPE,
    VoteActions,
)

from search.api import (
    gen_post_id,
    gen_comment_id,
    is_reddit_object_removed,
)
from search.serializers import (
    ESPostSerializer,
    ESCommentSerializer,
)
from search.tasks import (
    create_document,
    update_document_with_partial,
    increment_document_integer_field,
    update_field_values_by_query,
)

log = logging.getLogger()


def reddit_object_persist(*persistence_funcs):
    """
    Decorator that passes a PRAW object to any number of functions that persist the object to a new data store.
    The decorated function must return a PRAW object
    (e.g.: praw.models.reddit.submission.Submission, praw.models.reddit.comment.Comment)
    """
    def api_indexing_listener_inner(func):  # pylint: disable=missing-docstring
        @wraps(func)
        def wrapped_api_func(*args, **kwargs):  # pylint: disable=missing-docstring
            reddit_obj = func(*args, **kwargs)
            try:
                for persistence_func in persistence_funcs:
                    persistence_func(*reddit_obj)
            except Exception:  # pylint: disable=broad-except
                log.exception('Error occurred while trying to serialize and index PRAW object')
            return reddit_obj
        return wrapped_api_func
    return api_indexing_listener_inner


@if_feature_enabled(INDEX_UPDATES)
def index_new_post(post_obj, thumbnail):
    """
    Serializes a post object and runs a task to create an ES document for it.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    data = ESPostSerializer().serialize(post_obj)
    create_document.delay(
        gen_post_id(post_obj.id),
        data
    )


@if_feature_enabled(INDEX_UPDATES)
def index_new_comment(comment_obj):
    """
    Serializes a comment object and runs a task to create an ES document for it.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
    """
    data = ESCommentSerializer().serialize(comment_obj)
    create_document.delay(
        gen_comment_id(comment_obj.id),
        data
    )
    increment_parent_post_comment_count(comment_obj)


@if_feature_enabled(INDEX_UPDATES)
def update_post_text(post_obj):
    """
    Serializes post object text and runs a task to update the text for the associated ES document.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    update_document_with_partial.delay(
        gen_post_id(post_obj.id),
        {'text': post_obj.selftext}
    )


@if_feature_enabled(INDEX_UPDATES)
def update_comment_text(comment_obj):
    """
    Serializes comment object text and runs a task to update the text for the associated ES document.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
    """
    update_document_with_partial.delay(
        gen_comment_id(comment_obj.id),
        {'text': comment_obj.body}
    )


def update_field_for_all_post_comments(post_obj, field_name, field_value):
    """
    Runs a task to update a field value for all comments associated with a given post.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    update_field_values_by_query.delay(
        query={
            "query": {
                "bool": {
                    "must": [
                        {"match": {"object_type": COMMENT_TYPE}},
                        {"match": {"post_id": post_obj.id}}
                    ]
                }
            }
        },
        field_name=field_name,
        field_value=field_value
    )


@if_feature_enabled(INDEX_UPDATES)
def update_post_removal_status(post_obj):
    """
    Serializes the removal status for a post object and runs a task to update that status
    for the associated ES document.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    update_document_with_partial.delay(
        gen_post_id(post_obj.id),
        {'removed': is_reddit_object_removed(post_obj)}
    )
    update_field_for_all_post_comments(
        post_obj,
        field_name='parent_post_removed',
        field_value=is_reddit_object_removed(post_obj)
    )


@if_feature_enabled(INDEX_UPDATES)
def update_comment_removal_status(comment_obj):
    """
    Serializes the removal status for a comment object and runs a task to update that status
    for the associated ES document.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
    """
    update_document_with_partial.delay(
        gen_comment_id(comment_obj.id),
        {'removed': is_reddit_object_removed(comment_obj)}
    )


@if_feature_enabled(INDEX_UPDATES)
def _update_parent_post_comment_count(comment_obj, incr_amount=1):
    """
    Updates the comment count for a post object (retrieved via a comment object)
    and runs a task to update that count for the associated ES document.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
        incr_amount (int): The amount to increment to count
    """
    post_obj = comment_obj.submission
    increment_document_integer_field.delay(
        gen_post_id(post_obj.id),
        field_name='num_comments',
        incr_amount=incr_amount
    )


increment_parent_post_comment_count = partial(_update_parent_post_comment_count, incr_amount=1)
decrement_parent_post_comment_count = partial(_update_parent_post_comment_count, incr_amount=-1)


@if_feature_enabled(INDEX_UPDATES)
def set_post_to_deleted(post_obj):
    """
    Sets a post to deleted and updates child comments to be deleted as well.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    update_document_with_partial.delay(
        gen_post_id(post_obj.id),
        {'deleted': True}
    )
    update_field_for_all_post_comments(post_obj, field_name='deleted', field_value=True)


@if_feature_enabled(INDEX_UPDATES)
def set_comment_to_deleted(comment_obj):
    """
    Sets a comment to deleted and updates the parent post's comment count.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
    """
    update_document_with_partial.delay(
        gen_comment_id(comment_obj.id),
        {'deleted': True}
    )
    decrement_parent_post_comment_count(comment_obj)


@if_feature_enabled(INDEX_UPDATES)
def update_indexed_score(instance, instance_type, vote_action=None):
    """
    Runs a task to update the score for a post/comment document in ES.

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
    increment_document_integer_field.delay(
        gen_post_id(instance.id),
        field_name='score',
        incr_amount=vote_increment
    )
