"""Indexing tasks"""
from contextlib import contextmanager
import logging

import celery
from celery.exceptions import Ignore
from django.conf import settings
from django.contrib.auth import get_user_model
from elasticsearch.exceptions import NotFoundError
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException

from channels.constants import POSTS_SORT_NEW
from channels.utils import ListingParams
from open_discussions.celery import app
from open_discussions.utils import merge_strings
from search import indexing_api as api
from search.exceptions import (
    RetryException,
    ReindexException,
)


User = get_user_model()
log = logging.getLogger(__name__)


# For our tasks that attempt to partially update a document, there's a chance that
# the document has not yet been created. When we get an error that indicates that the
# document doesn't exist for the given ID, we will retry a few times in case there is
# a waiting task to create the document.
PARTIAL_UPDATE_TASK_SETTINGS = dict(
    autoretry_for=(NotFoundError,),
    retry_kwargs={'max_retries': 5},
    default_retry_delay=2
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
    except Exception as ex:
        # Celery is confused by exceptions which don't take a string as an argument, so we need to wrap before raising
        if isinstance(ex, exception_classes):
            raise RetryException(str(ex)) from ex
        raise


@app.task
def create_document(doc_id, data):
    """Task that makes a request to create an ES document"""
    return api.create_document(doc_id, data)


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def update_document_with_partial(doc_id, partial_data):
    """Task that makes a request to update an ES document with a partial document"""
    return api.update_document_with_partial(doc_id, partial_data)


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def increment_document_integer_field(doc_id, field_name, incr_amount):
    """Task that makes a request to increment some integer field in an ES document"""
    api.increment_document_integer_field(doc_id, field_name, incr_amount)


@app.task
def update_field_values_by_query(query, field_name, field_value):
    """
    Task that makes a request to update a field value for all ES documents that match some query.
    """
    return api.update_field_values_by_query(query, field_name, field_value)


@app.task(autoretry_for=(RetryException, ), retry_backoff=True, rate_limit='600/m')
def index_post_with_comments(post_id):
    """
    Index a post and its comments

    Args:
        post_id (str): The post string
    """
    try:
        with wrap_retry_exception(PrawcoreException, PRAWException):
            api.index_post_with_comments(post_id)
    except RetryException:
        raise
    except Ignore:
        raise
    except:  # pylint: disable=bare-except
        error = f"index_post_with_comments threw an error on post {post_id}"
        log.exception(error)
        return error


@app.task(bind=True, autoretry_for=(RetryException, ), retry_backoff=True, rate_limit='600/m')
def index_channel(self, channel_name):
    """
    Index the channel

    Args:
        channel_name (str): The name of the channel
    """
    try:
        with wrap_retry_exception(PrawcoreException, PRAWException):
            from channels.api import Api, sync_channel_model
            sync_channel_model(channel_name)

            client = Api(User.objects.get(username=settings.INDEXING_API_USERNAME))
            posts = client.list_posts(channel_name, ListingParams(None, None, 0, POSTS_SORT_NEW))

        raise self.replace(
            celery.group(
                index_post_with_comments.si(post.id) for post in posts
            )
        )
    except RetryException:
        raise
    except Ignore:
        raise
    except:  # pylint: disable=bare-except
        error = f"index_channel threw an error on channel {channel_name}"
        log.exception(error)
        return error


@app.task(bind=True)
def start_recreate_index(self):
    """
    Wipe and recreate index and mapping, and index all items.
    """
    try:
        from channels.api import Api
        user = User.objects.get(username=settings.INDEXING_API_USERNAME)

        new_backing_index = api.create_backing_index()

        # Do the indexing on the temp index
        log.info("starting to index all channels, posts and comments...")

        client = Api(user)
        channel_names = [channel.display_name for channel in client.list_channels()]
        index_channels = celery.group(
            index_channel.si(channel_name) for channel_name in channel_names
        )
    except:  # pylint: disable=bare-except
        error = "start_recreate_index threw an error"
        log.exception(error)
        return error

    # Use self.replace so that code waiting on this task will also wait on the indexing and finish tasks
    raise self.replace(
        celery.chain(
            index_channels,
            finish_recreate_index.s(new_backing_index),
        )
    )


@app.task
def finish_recreate_index(results, backing_index):
    """
    Swap reindex backing index with default backing index

    Args:
        results (list or bool): Results saying whether the error exists
        backing_index (str): The backing elasticsearch index
    """
    errors = merge_strings(results)
    if errors:
        raise ReindexException(f"Errors occurred during recreate_index: {errors}")

    log.info("Done with temporary index. Pointing default aliases to newly created backing indexes...")
    api.switch_indices(backing_index)
    log.info("recreate_index has finished successfully!")
