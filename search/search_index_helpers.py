"""
Functions that execute search-related asynchronous tasks
"""
import logging
from functools import partial, wraps

from django.conf import settings

from open_discussions.features import INDEX_UPDATES, if_feature_enabled
from search import tasks
from search.api import (
    gen_course_id,
    gen_podcast_episode_id,
    gen_podcast_id,
    gen_profile_id,
    gen_program_id,
    gen_staff_list_id,
    gen_user_list_id,
    gen_video_id,
)
from search.constants import (
    COURSE_TYPE,
    PODCAST_EPISODE_TYPE,
    PODCAST_TYPE,
    PROFILE_TYPE,
    PROGRAM_TYPE,
    STAFF_LIST_TYPE,
    USER_LIST_TYPE,
    VIDEO_TYPE,
)
from search.tasks import (
    deindex_document,
)

log = logging.getLogger()


def try_with_retry_as_task(function, *args):
    """
    Try running the task, if it errors, run it as a celery task.
    """
    try:
        function(*args)
    except Exception:  # pylint:disable=broad-except
        function.delay(*args)


def reddit_object_persist(*persistence_funcs):
    """
    Deprecated decorator - no longer used. Kept as stub for Phase 3 cleanup.
    """

    def decorator(func):
        return func

    return decorator


# Stub functions for removed discussion features - will be deleted in Phase 3
def index_new_post(post_obj):
    """Deprecated - no longer indexing posts"""
    pass


def index_new_comment(comment_obj):
    """Deprecated - no longer indexing comments"""
    pass


def update_post_text(post_obj):
    """Deprecated - no longer indexing posts"""
    pass


def update_comment_text(comment_obj):
    """Deprecated - no longer indexing comments"""
    pass


def update_channel_index(channel_obj):
    """Deprecated - no longer indexing channels"""
    pass


def update_post_removal_status(post_obj):
    """Deprecated - no longer indexing posts"""
    pass


def update_comment_removal_status(comment_obj):
    """Deprecated - no longer indexing comments"""
    pass


def set_post_to_deleted(post_obj):
    """Deprecated - no longer indexing posts"""
    pass


def set_comment_to_deleted(comment_obj):
    """Deprecated - no longer indexing comments"""
    pass


def update_indexed_score(instance, instance_type, vote_action=None):
    """Deprecated - no longer indexing post/comment scores"""
    pass


@if_feature_enabled(INDEX_UPDATES)
def upsert_profile(user_id):
    """
    Run a task to update all fields of a profile document except id (username)

    Args:
        user_id (int): the primary key for the User whose profile to query by and update
    """
    try_with_retry_as_task(tasks.upsert_profile, user_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_profile(user_obj):
    """
    Run a task to delete profile document

    Args:
        user_obj(django.contrib.auth.models.User): the User whose profile to query by and update
    """
    if user_obj.username != settings.INDEXING_API_USERNAME:
        try_with_retry_as_task(
            deindex_document, gen_profile_id(user_obj.username), PROFILE_TYPE
        )


@if_feature_enabled(INDEX_UPDATES)
def upsert_course(course_id):
    """
    Run a task to create or update a course's OpenSearch document

    Args:
        course_id (int): the primary key for the Course to update
    """
    try_with_retry_as_task(tasks.upsert_course, course_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_course(course_obj):
    """
    Runs a task to delete an ES Course document

    Args:
        course_obj (course_catalog.models.Course): A Course object
    """
    try_with_retry_as_task(
        deindex_document,
        gen_course_id(course_obj.platform, course_obj.course_id),
        COURSE_TYPE,
    )

    for run_id in course_obj.runs.values_list("id", flat=True):
        try_with_retry_as_task(deindex_run_content_files, run_id)


@if_feature_enabled(INDEX_UPDATES)
def upsert_content_file(content_file_id):
    """
    Run a task to create or update a content file's OpenSearch document

    Args:
        content_file_id (int): the primary key for the ContentFile to update
    """
    try_with_retry_as_task(tasks.upsert_content_file, content_file_id)


@if_feature_enabled(INDEX_UPDATES)
def index_run_content_files(run_id):
    """
    Runs a task to index content files for a LearningResourceRun

    Args:
        run_id(int): LearningResourceRun id

    """
    try_with_retry_as_task(tasks.index_run_content_files, run_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_run_content_files(run_id):
    """
    Runs a task to delete content files for a LearningResourceRun from the index

    Args:
        run_id(int): LearningResourceRun id

    """
    try_with_retry_as_task(tasks.deindex_run_content_files, run_id)


@if_feature_enabled(INDEX_UPDATES)
def upsert_program(program_id):
    """
    Run a task to create or update a program OpenSearch document

    Args:
        program_id (int): the primary key for the Program to update in ES
    """
    try_with_retry_as_task(tasks.upsert_program, program_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_program(program_obj):
    """
    Runs a task to delete an ES Program document

    Args:
        program_obj (course_catalog.models.Program): A Program object
    """
    try_with_retry_as_task(deindex_document, gen_program_id(program_obj), PROGRAM_TYPE)


@if_feature_enabled(INDEX_UPDATES)
def upsert_user_list(user_list_id):
    """
    Run a task to update all fields of a UserList OpenSearch document

    Args:
        user_list_id (int): the primary key for the UserList to update in ES
    """
    try_with_retry_as_task(tasks.upsert_user_list, user_list_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_user_list(user_list_obj):
    """
    Runs a task to delete an ES UserList document

    Args:
        user_list_obj (course_catalog.models.UserList): A UserList object
    """
    try_with_retry_as_task(
        deindex_document, gen_user_list_id(user_list_obj), USER_LIST_TYPE
    )


@if_feature_enabled(INDEX_UPDATES)
def upsert_staff_list(staff_list_id):
    """
    Run a task to update all fields of a StaffList OpenSearch document

    Args:
        staff_list_id (int): the primary key for the StaffList to update in ES
    """
    try_with_retry_as_task(tasks.upsert_staff_list, staff_list_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_staff_list(staff_list_obj):
    """
    Runs a task to delete an ES StaffList document

    Args:
        staff_list_obj (course_catalog.models.StaffList): A StaffList object
    """
    try_with_retry_as_task(
        deindex_document, gen_staff_list_id(staff_list_obj), STAFF_LIST_TYPE
    )


@if_feature_enabled(INDEX_UPDATES)
def upsert_video(video_id):
    """
    Run a task to create or update a video OpenSearch document

    Args:
        video_id (int): the database primary key of the Video to update in ES
    """
    try_with_retry_as_task(tasks.upsert_video, video_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_video(video_obj):
    """
    Runs a task to delete an ES Video document

    Args:
        video_obj (course_catalog.models.Video): A Video object
    """
    try_with_retry_as_task(deindex_document, gen_video_id(video_obj), VIDEO_TYPE)


@if_feature_enabled(INDEX_UPDATES)
def upsert_podcast(podcast_id):
    """
    Run a task to create or update a podcast OpenSearch document

    Args:
        podcast_id (int): the database primary key of the Podcast to update in ES
    """
    try_with_retry_as_task(tasks.upsert_podcast, podcast_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_podcast(podcast_obj):
    """
    Runs a task to delete an ES Podcast document

    Args:
        podcast_obj (course_catalog.models.Podcast): A Podcast object
    """
    try_with_retry_as_task(deindex_document, gen_podcast_id(podcast_obj), PODCAST_TYPE)


@if_feature_enabled(INDEX_UPDATES)
def upsert_podcast_episode(podcast_episode_id):
    """
    Run a task to create or update a podcast episode OpenSearch document

    Args:
        podcast_episode_id (int): the database primary key of the PodcastEpisode to update in ES
    """
    try_with_retry_as_task(tasks.upsert_podcast_episode, podcast_episode_id)


@if_feature_enabled(INDEX_UPDATES)
def deindex_podcast_episode(podcast_episode_obj):
    """
    Runs a task to delete an ES PodcastEpisode document

    Args:
        podcast_episode_obj (course_catalog.models.PodcastEpisode): A PodcastEpisode object
    """
    try_with_retry_as_task(
        deindex_document,
        gen_podcast_episode_id(podcast_episode_obj),
        PODCAST_EPISODE_TYPE,
    )
