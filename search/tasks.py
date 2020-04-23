"""Indexing tasks"""
from contextlib import contextmanager
import logging

import celery
from celery.exceptions import Ignore
from django.conf import settings
from django.contrib.auth import get_user_model
from elasticsearch.exceptions import NotFoundError
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException, NotFound

from channels.constants import LINK_TYPE_LINK, POST_TYPE, COMMENT_TYPE
from channels.models import Comment, Post
from course_catalog.constants import PlatformType
from course_catalog.models import (
    Course,
    Bootcamp,
    Program,
    UserList,
    Video,
    ContentFile,
    Podcast,
    PodcastEpisode,
)
from course_catalog.utils import load_course_blacklist
from embedly.api import get_embedly_content
from open_discussions.celery import app
from open_discussions.utils import merge_strings, chunks, html_to_plain_text
from profiles.models import Profile
from search import indexing_api as api
from search.api import gen_content_file_id, gen_course_id
from search.constants import (
    BOOTCAMP_TYPE,
    COURSE_TYPE,
    PROFILE_TYPE,
    PROGRAM_TYPE,
    VALID_OBJECT_TYPES,
    VIDEO_TYPE,
    USER_LIST_TYPE,
    PODCAST_TYPE,
    PODCAST_EPISODE_TYPE,
)
from search.exceptions import RetryException, ReindexException
from search.serializers import (
    ESBootcampSerializer,
    ESCourseSerializer,
    ESProgramSerializer,
    ESProfileSerializer,
    ESVideoSerializer,
    ESUserListSerializer,
    ESContentFileSerializer,
    ESPodcastSerializer,
    ESPodcastEpisodeSerializer,
)

User = get_user_model()
log = logging.getLogger(__name__)


# For our tasks that attempt to partially update a document, there's a chance that
# the document has not yet been created. When we get an error that indicates that the
# document doesn't exist for the given ID, we will retry a few times in case there is
# a waiting task to create the document.
PARTIAL_UPDATE_TASK_SETTINGS = dict(
    autoretry_for=(NotFoundError,),
    retry_kwargs={"max_retries": 5},
    default_retry_delay=2,
)


@contextmanager
def wrap_retry_exception(*exception_classes):
    """
    Wrap exceptions with RetryException so Celery can use it for autoretry

    Args:
        *exception_classes (tuple of type): Exception classes which should become RetryException
    """
    try:
        yield
    except Exception as ex:  # pylint:disable=bare-except
        if isinstance(ex, NotFound):
            # No corresponding reddit post/comment found for django model object.  Log error and continue indexing.
            log.exception(
                "No corresponding reddit post/comment found for django model object"
            )
            return
        # Celery is confused by exceptions which don't take a string as an argument, so we need to wrap before raising
        if isinstance(ex, exception_classes):
            raise RetryException(str(ex)) from ex
        raise


@app.task
def create_document(doc_id, data):
    """Task that makes a request to create an ES document"""
    return api.create_document(doc_id, data)


@app.task
def index_new_bootcamp(bootcamp_id):
    """Task that makes a request to create an ES document for a bootcamp"""
    from search.api import gen_bootcamp_id

    bootcamp = Bootcamp.objects.get(id=bootcamp_id)
    data = ESBootcampSerializer(bootcamp).data
    api.create_document(gen_bootcamp_id(bootcamp.course_id), data)


@app.task
def upsert_profile(profile_id):
    """Task that indexes a profile based on its primary key"""
    from search.api import gen_profile_id

    profile = Profile.objects.get(id=profile_id)

    if profile.user.username != settings.INDEXING_API_USERNAME:
        data = ESProfileSerializer().serialize(profile)
        api.upsert_document(
            gen_profile_id(profile.user.username),
            data,
            PROFILE_TYPE,
            retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
        )


def _update_fields_by_username(username, field_dict, object_types):
    """
    Runs a task to update a field value for all docs associated with a given user.

    Args:
        username (str): The username to query by
        field_dict (dict): Dictionary of fields to update
        object_types (list of str): The object types to update
    """
    api.update_field_values_by_query(
        query={"query": {"bool": {"must": [{"match": {"author_id": username}}]}}},
        field_dict=field_dict,
        object_types=object_types,
    )


@app.task
def update_author_posts_comments(profile_id):
    """Update author name and avatar in all associated post and comment docs"""
    profile_obj = Profile.objects.get(id=profile_id)
    profile_data = ESProfileSerializer().serialize(profile_obj)
    update_keys = {
        key: value
        for key, value in profile_data.items()
        if key in ["author_name", "author_headline", "author_avatar_small"]
    }
    _update_fields_by_username(
        profile_obj.user.username, update_keys, [POST_TYPE, COMMENT_TYPE]
    )


@app.task
def update_link_post_with_preview(doc_id, data):
    """
    Task that fetches Embedly preview data for a link post and updates the corresponding
    database and Elasticsearch objects

    Args:
        doc_id (str): ES document ID
        data (dict): Dict of serialized post data produced by ESPostSerializer
    """
    if not data["post_link_url"]:
        return None
    response = get_embedly_content(data["post_link_url"]).json()
    # Parse the embedly response to produce the link preview text
    preview_text = (
        html_to_plain_text(response["content"]).strip()
        if response.get("content")
        else response["description"]
    )
    # Update the post in the database
    post = Post.objects.get(post_id=data["post_id"])
    post.preview_text = preview_text
    post.save()
    # Update the post in ES
    return api.update_post(doc_id, post)


@app.task
def create_post_document(doc_id, data):
    """
    Task that makes a request to create an ES document for a post, and if it's a link-type
    post, updates the newly-created post with preview text
    """
    tasks = [create_document.si(doc_id, data)]
    if data.get("post_type") == LINK_TYPE_LINK and data.get("post_link_url"):
        tasks.append(update_link_post_with_preview.si(doc_id, data))
    return celery.chain(tasks)()


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def update_document_with_partial(
    doc_id, partial_data, object_type, retry_on_conflict=0
):
    """Task that makes a request to update an ES document with a partial document"""
    return api.update_document_with_partial(
        doc_id, partial_data, object_type, retry_on_conflict=retry_on_conflict
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_course(course_id):
    """Upsert course based on stored database information"""
    course_obj = Course.objects.get(id=course_id)
    course_data = ESCourseSerializer(course_obj).data
    api.upsert_document(
        gen_course_id(course_obj.platform, course_obj.course_id),
        course_data,
        COURSE_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_content_file(file_id):
    """Upsert content file based on stored database information"""

    content_file_obj = ContentFile.objects.get(id=file_id)
    content_file_data = ESContentFileSerializer(content_file_obj).data
    api.upsert_document(
        gen_content_file_id(content_file_obj.key),
        content_file_data,
        COURSE_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
        routing=gen_course_id(
            content_file_obj.run.content_object.platform,
            content_file_obj.run.content_object.course_id,
        ),
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_bootcamp(bootcamp_id):
    """Upsert bootcamp based on stored database information"""
    from search.api import gen_bootcamp_id

    bootcamp_obj = Bootcamp.objects.get(id=bootcamp_id)
    bootcamp_data = ESBootcampSerializer(bootcamp_obj).data
    api.upsert_document(
        gen_bootcamp_id(bootcamp_obj.course_id),
        bootcamp_data,
        BOOTCAMP_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_program(program_id):
    """Upsert program based on stored database information"""
    from search.api import gen_program_id

    program_obj = Program.objects.get(id=program_id)
    program_data = ESProgramSerializer(program_obj).data
    api.upsert_document(
        gen_program_id(program_obj),
        program_data,
        PROGRAM_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_video(video_id):
    """Upsert video based on stored database information"""
    from search.api import gen_video_id

    video_obj = Video.objects.get(id=video_id)
    video_data = ESVideoSerializer(video_obj).data
    api.upsert_document(
        gen_video_id(video_obj),
        video_data,
        VIDEO_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_user_list(user_list_id):
    """Upsert user list based on stored database information"""
    from search.api import gen_user_list_id

    user_list_obj = UserList.objects.get(id=user_list_id)
    user_list_data = ESUserListSerializer(user_list_obj).data
    api.upsert_document(
        gen_user_list_id(user_list_obj),
        user_list_data,
        USER_LIST_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_podcast(podcast_id):
    """Upsert podcast based on stored database information"""
    from search.api import gen_podcast_id

    podcast_obj = Podcast.objects.get(id=podcast_id)
    podcast_data = ESPodcastSerializer(podcast_obj).data
    api.upsert_document(
        gen_podcast_id(podcast_obj),
        podcast_data,
        PODCAST_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def upsert_podcast_episode(podcast_episode_id):
    """Upsert podcast episode based on stored database information"""
    from search.api import gen_podcast_episode_id

    podcast_episode_obj = PodcastEpisode.objects.get(id=podcast_episode_id)
    podcast_episode_data = ESPodcastEpisodeSerializer(podcast_episode_obj).data
    api.upsert_document(
        gen_podcast_episode_id(podcast_episode_obj),
        podcast_episode_data,
        PODCAST_EPISODE_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


@app.task
def delete_document(doc_id, object_type, **kwargs):
    """Task that makes a request to remove an ES document"""
    return api.delete_document(doc_id, object_type, **kwargs)


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def increment_document_integer_field(doc_id, field_name, incr_amount, object_type):
    """Task that makes a request to increment some integer field in an ES document"""
    api.increment_document_integer_field(doc_id, field_name, incr_amount, object_type)


@app.task
def update_field_values_by_query(query, field_dict, object_types):
    """
    Task that makes a request to update a field value for all ES documents that match some query.
    """
    return api.update_field_values_by_query(query, field_dict, object_types)


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_profiles(ids):
    """
    Index user profiles by a list of Profile.id

    Args:
        ids(list of int): List of profile id's

    """
    try:
        api.index_profiles(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = "index_profiles threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_posts(post_ids):
    """
    Index a list of posts by a list of Post.id

    Args:
        post_ids (list of int): list of Post.id to index
    """
    try:
        with wrap_retry_exception(PrawcoreException, PRAWException):
            api.index_posts(post_ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = "index_posts threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_comments(comment_ids):
    """
    Index a list of comments by a list of Comment.id

    Args:
        comment_ids (list of int): list of Comment.id to index
    """
    try:
        with wrap_retry_exception(PrawcoreException, PRAWException):
            api.index_comments(comment_ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = "index_comments threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_courses(ids):
    """
    Index courses

    Args:
        ids(list of int): List of course id's

    """
    try:
        api.index_courses(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_courses threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_course_content_files(course_ids):
    """
    Index content files for a list of course ids

    Args:
        course_ids(list of int): List of course id's

    """
    try:
        api.index_course_content_files(course_ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_course_content_files threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_run_content_files(run_id):
    """
    Index content files for a LearningResourceRun

    Args:
        run_id(int): LearningResourceRun id

    """
    try:
        api.index_run_content_files(run_id)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_run_content_files threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def delete_run_content_files(run_id):
    """
    Deleted content files for a LearningResourceRun from the index

    Args:
        run_id(int): LearningResourceRun id

    """
    try:
        api.delete_run_content_files(run_id)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"delete_run_content_files threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_bootcamps(ids):
    """
    Index bootcamps

    Args:
        ids(list of int): List of bootcamp id's

    """
    try:
        api.index_bootcamps(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_bootcamps threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_programs(ids):
    """
    Index programs

    Args:
        ids(list of int): List of program id's

    """
    try:
        api.index_programs(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_programs threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_user_lists(ids):
    """
    Index UserLists

    Args:
        ids(list of int): List of UserList id's

    """
    try:
        api.index_user_lists(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_user_lists threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_videos(ids):
    """
    Index Videos

    Args:
        ids(list of int): List of Video id's

    """
    try:
        api.index_videos(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_videos threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_podcasts(ids):
    """
    Index Podcasts

    Args:
        ids(list of int): List of Podcast id's
    """
    try:
        api.index_podcasts(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_podcasts threw an error"
        log.exception(error)
        return error


@app.task(autoretry_for=(RetryException,), retry_backoff=True, rate_limit="600/m")
def index_podcast_episodes(ids):
    """
    Index PodcastEpisodes

    Args:
        ids(list of int): List of PodcastEpisode id's
    """
    try:
        api.index_podcast_episodes(ids)
    except (RetryException, Ignore):
        raise
    except:  # pylint: disable=bare-except
        error = f"index_podcast_episodes threw an error"
        log.exception(error)
        return error


@app.task(bind=True)
def start_recreate_index(self):
    """
    Wipe and recreate index and mapping, and index all items.
    """
    try:
        new_backing_indices = {
            obj_type: api.create_backing_index(obj_type)
            for obj_type in VALID_OBJECT_TYPES
        }

        # Do the indexing on the temp index
        log.info(
            "starting to index all posts, comments, profiles, and course catalog objects..."
        )

        blacklisted_ids = load_course_blacklist()

        index_tasks = celery.group(
            [
                index_posts.si(post_ids)
                for post_ids in chunks(
                    Post.objects.order_by("id").values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_comments.si(comment_ids)
                for comment_ids in chunks(
                    Comment.objects.order_by("id").values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_profiles.si(ids)
                for ids in chunks(
                    User.objects.exclude(username=settings.INDEXING_API_USERNAME)
                    .exclude(profile__isnull=True)
                    .filter(is_active=True)
                    .order_by("id")
                    .values_list("profile__id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_courses.si(ids)
                for ids in chunks(
                    Course.objects.filter(published=True)
                    .exclude(course_id__in=blacklisted_ids)
                    .order_by("id")
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_course_content_files.si(ids)
                for ids in chunks(
                    Course.objects.filter(published=True)
                    .filter(
                        platform__in=(PlatformType.ocw.value, PlatformType.xpro.value)
                    )
                    .exclude(course_id__in=blacklisted_ids)
                    .order_by("id")
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_bootcamps.si(ids)
                for ids in chunks(
                    Bootcamp.objects.filter(published=True)
                    .order_by("id")
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_programs.si(ids)
                for ids in chunks(
                    Program.objects.filter(published=True)
                    .order_by("id")
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_user_lists.si(ids)
                for ids in chunks(
                    UserList.objects.order_by("id")
                    .exclude(items=None)
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_videos.si(ids)
                for ids in chunks(
                    Video.objects.filter(published=True)
                    .order_by("id")
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_podcasts.si(ids)
                for ids in chunks(
                    Podcast.objects.filter(published=True)
                    .order_by("id")
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_podcast_episodes.si(ids)
                for ids in chunks(
                    PodcastEpisode.objects.filter(published=True)
                    .order_by("id")
                    .values_list("id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
        )

    except:  # pylint: disable=bare-except
        error = "start_recreate_index threw an error"
        log.exception(error)
        return error

    # Use self.replace so that code waiting on this task will also wait on the indexing and finish tasks
    raise self.replace(
        celery.chain(index_tasks, finish_recreate_index.s(new_backing_indices))
    )


@app.task
def finish_recreate_index(results, backing_indices):
    """
    Swap reindex backing index with default backing index

    Args:
        results (list or bool): Results saying whether the error exists
        backing_indices (dict): The backing elasticsearch indices keyed by object type
    """
    errors = merge_strings(results)
    if errors:
        raise ReindexException(f"Errors occurred during recreate_index: {errors}")

    log.info(
        "Done with temporary index. Pointing default aliases to newly created backing indexes..."
    )
    for obj_type, backing_index in backing_indices.items():
        api.switch_indices(backing_index, obj_type)
    log.info("recreate_index has finished successfully!")
