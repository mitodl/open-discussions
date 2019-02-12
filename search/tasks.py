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

from channels.models import Comment
from channels.models import Post
from course_catalog.models import Course
from open_discussions.celery import app
from open_discussions.utils import merge_strings, chunks
from search import indexing_api as api
from search.constants import VALID_OBJECT_TYPES
from search.exceptions import RetryException, ReindexException

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


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def update_document_with_partial(
    doc_id, partial_data, object_type, retry_on_conflict=0
):
    """Task that makes a request to update an ES document with a partial document"""
    return api.update_document_with_partial(
        doc_id, partial_data, object_type, retry_on_conflict=retry_on_conflict
    )


@app.task
def delete_document(doc_id, object_type):
    """Task that makes a request to remove an ES document"""
    return api.delete_document(doc_id, object_type)


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
        log.info("starting to index all posts, comments, and profiles...")

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
                    .order_by("id")
                    .values_list("profile__id", flat=True),
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )
            ]
            + [
                index_courses.si(ids)
                for ids in chunks(
                    Course.objects.order_by("id").values_list("id", flat=True),
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
