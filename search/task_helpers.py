"""
Functions that execute search-related asynchronous tasks
"""
import logging
from functools import wraps, partial

from django.conf import settings

from open_discussions.features import INDEX_UPDATES, if_feature_enabled
from channels.constants import POST_TYPE, COMMENT_TYPE, VoteActions
from channels.models import Comment
from channels.utils import render_article_text

from search.api import (
    gen_post_id,
    gen_comment_id,
    gen_profile_id,
    is_reddit_object_removed,
    gen_course_id,
    gen_bootcamp_id,
    gen_program_id,
    gen_user_list_id,
    gen_video_id,
)
from search.constants import (
    PROFILE_TYPE,
    COURSE_TYPE,
    BOOTCAMP_TYPE,
    PROGRAM_TYPE,
    USER_LIST_TYPE,
    VIDEO_TYPE,
)
from search.serializers import (
    ESPostSerializer,
    ESCommentSerializer,
    ESProfileSerializer,
    ESCourseSerializer,
    ESBootcampSerializer,
    ESUserListSerializer,
    ESProgramSerializer,
)
from search import tasks
from search.tasks import (
    create_document,
    create_post_document,
    update_document_with_partial,
    upsert_document,
    increment_document_integer_field,
    update_field_values_by_query,
    delete_document,
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
                    persistence_func(reddit_obj)
            except Exception:  # pylint: disable=broad-except
                log.exception(
                    "Error occurred while trying to serialize and index PRAW object"
                )
            return reddit_obj

        return wrapped_api_func

    return api_indexing_listener_inner


@if_feature_enabled(INDEX_UPDATES)
def index_new_profile(profile_obj):
    """
    Serializes a profile object and runs a task to create an ES document for it.

    Args:
        profile_obj (profiles.models.Profile): A user Profile object
    """
    data = ESProfileSerializer().serialize(profile_obj)
    create_document.delay(gen_profile_id(profile_obj.user.username), data)


@if_feature_enabled(INDEX_UPDATES)
def index_new_post(post_obj):
    """
    Serializes a post object and runs a task to create an ES document for it.

    Args:
        post_obj (channels.proxies.PostProxy): A proxied post/submission
    """
    post = post_obj._self_post  # pylint: disable=protected-access
    data = ESPostSerializer(instance=post).data
    create_post_document.delay(gen_post_id(post.post_id), data)


@if_feature_enabled(INDEX_UPDATES)
def index_new_comment(comment_obj):
    """
    Serializes a comment object and runs a task to create an ES document for it.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
    """
    comment = Comment.objects.get(comment_id=comment_obj.id)
    data = ESCommentSerializer(instance=comment).data
    create_document.delay(gen_comment_id(comment_obj.id), data)
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
        {
            "plain_text": render_article_text(post_obj.article_content),
            "text": post_obj.selftext,
        },
        POST_TYPE,
    )


@if_feature_enabled(INDEX_UPDATES)
def update_comment_text(comment_obj):
    """
    Serializes comment object text and runs a task to update the text for the associated ES document.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
    """
    update_document_with_partial.delay(
        gen_comment_id(comment_obj.id), {"text": comment_obj.body}, COMMENT_TYPE
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
                        {"match": {"post_id": post_obj.id}},
                    ]
                }
            }
        },
        field_dict={field_name: field_value},
        object_types=[COMMENT_TYPE],
    )


def update_fields_by_username(username, field_dict, object_types):
    """
    Runs a task to update a field value for all docs associated with a given user.

    Args:
        username (str): The username to query by
        field_dict (dict): Dictionary of fields to update
        object_types (list of str): The object types to update
    """
    update_field_values_by_query.delay(
        query={"query": {"bool": {"must": [{"match": {"author_id": username}}]}}},
        field_dict=field_dict,
        object_types=object_types,
    )


@if_feature_enabled(INDEX_UPDATES)
def update_channel_index(channel_obj):
    """
    Runs a task to update the channel title, type for all posts and comments associated with the given channel.

    Args:
        channel_obj (praw.models.Subreddit): A PRAW channel ('subreddit') object
    """
    update_field_values_by_query.delay(
        query={
            "query": {
                "bool": {
                    "must": [{"match": {"channel_name": channel_obj.display_name}}]
                }
            }
        },
        field_dict={
            "channel_title": channel_obj.title,
            "channel_type": channel_obj.subreddit_type,
        },
        object_types=[COMMENT_TYPE, POST_TYPE],
    )


@if_feature_enabled(INDEX_UPDATES)
def update_author(user_obj):
    """
    Run a task to update all fields of a profile document except id (username)

    Args:
        user_obj(django.contrib.auth.models.User): the User whose profile to query by and update
    """
    if user_obj.username != settings.INDEXING_API_USERNAME:
        profile_data = ESProfileSerializer().serialize(user_obj.profile)
        profile_data.pop("author_id", None)
        update_document_with_partial.delay(
            gen_profile_id(user_obj.username),
            profile_data,
            PROFILE_TYPE,
            retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
        )


@if_feature_enabled(INDEX_UPDATES)
def delete_profile(user_obj):
    """
    Run a task to delete profile document

    Args:
        user_obj(django.contrib.auth.models.User): the User whose profile to query by and update
    """
    if user_obj.username != settings.INDEXING_API_USERNAME:
        delete_document.delay(gen_profile_id(user_obj.username), PROFILE_TYPE)


@if_feature_enabled(INDEX_UPDATES)
def update_author_posts_comments(profile_obj):
    """
    Run a task to update author name and avatar in all associated post and comment docs

    Args:
        profile_obj(profiles.models.Profile): the Profile object to query by
    """
    profile_data = ESProfileSerializer().serialize(profile_obj)
    update_keys = {
        key: value
        for key, value in profile_data.items()
        if key in ["author_name", "author_headline", "author_avatar_small"]
    }
    update_fields_by_username(
        profile_obj.user.username, update_keys, [POST_TYPE, COMMENT_TYPE]
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
        {"removed": is_reddit_object_removed(post_obj)},
        POST_TYPE,
    )
    update_field_for_all_post_comments(
        post_obj,
        field_name="parent_post_removed",
        field_value=is_reddit_object_removed(post_obj),
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
        {"removed": is_reddit_object_removed(comment_obj)},
        COMMENT_TYPE,
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
        field_name="num_comments",
        incr_amount=incr_amount,
        object_type=POST_TYPE,
    )


increment_parent_post_comment_count = partial(
    _update_parent_post_comment_count, incr_amount=1
)
decrement_parent_post_comment_count = partial(
    _update_parent_post_comment_count, incr_amount=-1
)


@if_feature_enabled(INDEX_UPDATES)
def set_post_to_deleted(post_obj):
    """
    Sets a post to deleted and updates child comments to be deleted as well.

    Args:
        post_obj (praw.models.reddit.submission.Submission): A PRAW post ('submission') object
    """
    update_document_with_partial.delay(
        gen_post_id(post_obj.id), {"deleted": True}, POST_TYPE
    )
    update_field_for_all_post_comments(post_obj, field_name="deleted", field_value=True)


@if_feature_enabled(INDEX_UPDATES)
def set_comment_to_deleted(comment_obj):
    """
    Sets a comment to deleted and updates the parent post's comment count.

    Args:
        comment_obj (praw.models.reddit.comment.Comment): A PRAW comment object
    """
    update_document_with_partial.delay(
        gen_comment_id(comment_obj.id), {"deleted": True}, COMMENT_TYPE
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
        raise ValueError("Received an invalid vote action value: %s" % vote_action)

    if instance_type not in [POST_TYPE, COMMENT_TYPE]:
        return
    content_id = (
        gen_post_id(instance.id)
        if instance_type == POST_TYPE
        else gen_comment_id(instance.id)
    )

    increment_document_integer_field.delay(
        content_id,
        field_name="score",
        incr_amount=vote_increment,
        object_type=instance_type,
    )


@if_feature_enabled(INDEX_UPDATES)
def upsert_course(course_obj):
    """
    Run a task to create or update a course Elasticsearch document

    Args:
        course_obj(Course): the Course to update in ES
    """

    course_data = ESCourseSerializer(course_obj).data
    upsert_document.delay(
        gen_course_id(course_obj.platform, course_obj.course_id),
        course_data,
        COURSE_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@if_feature_enabled(INDEX_UPDATES)
def delete_course(course_obj):
    """
    Runs a task to delete an ES Course document

    Args:
        course_obj (course_catalog.models.Course): A Course object
    """
    delete_document.delay(
        gen_course_id(course_obj.platform, course_obj.course_id), COURSE_TYPE
    )


@if_feature_enabled(INDEX_UPDATES)
def index_new_bootcamp(bootcamp_obj):
    """
    Serializes a bootcamp object and runs a task to create an ES document for it.

    Args:
        bootcamp_obj (course_catalog.models.Bootcamp): A Bootcamp object
    """
    data = ESBootcampSerializer(bootcamp_obj).data
    create_document.delay(gen_bootcamp_id(bootcamp_obj.course_id), data)


@if_feature_enabled(INDEX_UPDATES)
def update_bootcamp(bootcamp_obj):
    """
    Run a task to update all fields of a bootcamp Elasticsearch document

    Args:
        bootcamp_obj(Bootcamp): the Bootcamp to update in ES
    """

    bootcamp_data = ESBootcampSerializer(bootcamp_obj).data
    update_document_with_partial.delay(
        gen_bootcamp_id(bootcamp_obj.course_id),
        bootcamp_data,
        BOOTCAMP_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@if_feature_enabled(INDEX_UPDATES)
def delete_bootcamp(bootcamp_obj):
    """
    Runs a task to delete an ES Bootcamp document

    Args:
        bootcamp_obj (course_catalog.models.Bootcamp): A Bootcamp object
    """
    delete_document.delay(gen_bootcamp_id(bootcamp_obj.course_id), BOOTCAMP_TYPE)


@if_feature_enabled(INDEX_UPDATES)
def upsert_program(program_obj):
    """
    Run a task to create or update a program Elasticsearch document

    Args:
        program_obj(Program): the Program to update in ES
    """

    program_data = ESProgramSerializer(program_obj).data
    upsert_document.delay(
        gen_program_id(program_obj),
        program_data,
        PROGRAM_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@if_feature_enabled(INDEX_UPDATES)
def delete_program(program_obj):
    """
    Runs a task to delete an ES Program document

    Args:
        program_obj (course_catalog.models.Program): A Program object
    """
    delete_document.delay(gen_program_id(program_obj), PROGRAM_TYPE)


@if_feature_enabled(INDEX_UPDATES)
def index_new_user_list(user_list_obj):
    """
    Serializes a UserList object and runs a task to create an ES document for it.

    Args:
        user_list_obj (course_catalog.models.UserList): A UserList object
    """
    data = ESUserListSerializer(user_list_obj).data
    create_document.delay(gen_user_list_id(user_list_obj), data)


@if_feature_enabled(INDEX_UPDATES)
def upsert_user_list(user_list_obj):
    """
    Run a task to update all fields of a UserList Elasticsearch document

    Args:
        user_list_obj(UserList): the UserList to update in ES
    """
    user_list_data = ESUserListSerializer(user_list_obj).data
    upsert_document.delay(
        gen_user_list_id(user_list_obj),
        user_list_data,
        USER_LIST_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@if_feature_enabled(INDEX_UPDATES)
def delete_user_list(user_list_obj):
    """
    Runs a task to delete an ES UserList document

    Args:
        user_list_obj (course_catalog.models.UserList): A UserList object
    """
    delete_document.delay(gen_user_list_id(user_list_obj), USER_LIST_TYPE)


@if_feature_enabled(INDEX_UPDATES)
def upsert_video(video_id):
    """
    Run a task to create or update a video Elasticsearch document

    Args:
        video_id (int): the database primary key of the Video to update in ES
    """
    tasks.upsert_video.delay(video_id)


@if_feature_enabled(INDEX_UPDATES)
def delete_video(video_obj):
    """
    Runs a task to delete an ES Video document

    Args:
        video_obj (course_catalog.models.Video): A Video object
    """
    delete_document.delay(gen_video_id(video_obj), VIDEO_TYPE)
