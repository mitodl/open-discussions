"""Indexing tasks"""
from contextlib import contextmanager

from celery import (
    chain,
    group,
)
from celery.utils.log import get_task_logger
from django.contrib.auth import get_user_model
from elasticsearch.exceptions import NotFoundError
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException

from open_discussions.celery import app
from search import indexing_api as api
from search.connection import (
    get_conn,
    get_default_alias_name,
    get_reindexing_alias_name,
    make_backing_index_name,
)
from search.exceptions import RetryException
from search.indexing_api import (
    clear_and_create_index,
    refresh_index,
)


User = get_user_model()
log = get_task_logger(__name__)


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
    api.create_document(doc_id, data)


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def update_document_with_partial(doc_id, partial_data):
    """Task that makes a request to update an ES document with a partial document"""
    api.update_document_with_partial(doc_id, partial_data)


@app.task(**PARTIAL_UPDATE_TASK_SETTINGS)
def increment_document_integer_field(doc_id, field_name, incr_amount):
    """Task that makes a request to increment some integer field in an ES document"""
    api.increment_document_integer_field(doc_id, field_name, incr_amount)


@app.task(autoretry_for=(RetryException, ), retry_backoff=True, rate_limit='600/m')
def index_post(api_username, post_id):
    """
    Index a post and its comments

    Args:
        api_username (str): The API username
        post_id (str): The post string
    """
    with wrap_retry_exception(PrawcoreException, PRAWException):
        api.index_post(api_username, post_id)


@app.task(bind=True, autoretry_for=(RetryException, ), retry_backoff=True, rate_limit='600/m')
def index_channel(self, api_username, channel_name):
    """
    Index the channel

    Args:
        api_username (str): API username
        channel_name (str): The name of the channel
    """
    with wrap_retry_exception(PrawcoreException, PRAWException):
        from channels.api import Api

        client = Api(User.objects.get(username=api_username))
        channel = client.get_channel(channel_name)
        post_ids = [post.id for post in channel.new()]

    raise self.replace(
        group(
            index_post.si(api_username=api_username, post_id=post_id) for post_id in post_ids
        )
    )


@app.task(bind=True)
def start_recreate_index(self, api_username):
    """
    Wipe and recreate index and mapping, and index all items.

    Args:
        api_username (str): The reddit username to use when crawling data
    """
    from channels.api import Api

    user = User.objects.get(username=api_username)
    conn = get_conn(verify=False)

    # Create new backing index for reindex
    new_backing_index = make_backing_index_name()

    # Clear away temp alias so we can reuse it, and create mappings
    clear_and_create_index(index_name=new_backing_index)
    temp_alias = get_reindexing_alias_name()
    if conn.indices.exists_alias(name=temp_alias):
        # Deletes both alias and backing indexes
        conn.indices.delete_alias(index="_all", name=temp_alias)

    # Point temp_alias toward new backing index
    conn.indices.put_alias(index=new_backing_index, name=temp_alias)

    # Do the indexing on the temp index
    log.info("starting to index all channels, posts and comments...")

    client = Api(user)
    channel_names = [channel.display_name for channel in client.list_channels()]
    index_channels = group(
        index_channel.si(api_username=api_username, channel_name=channel_name)
        for channel_name in channel_names
    )

    # Use self.replace so that code waiting on this task will also wait on the indexing and finish tasks
    raise self.replace(
        chain(
            index_channels,
            finish_recreate_index.si(new_backing_index),
        )
    )


@app.task
def finish_recreate_index(backing_index):
    """
    Swap reindex backing index with default backing index

    Args:
        backing_index (str): The backing elasticsearch index
    """
    log.info("Done with temporary index. Pointing default aliases to newly created backing indexes...")

    conn = get_conn(verify=False)
    actions = []
    old_backing_indexes = []
    default_alias = get_default_alias_name()
    if conn.indices.exists_alias(name=default_alias):
        # Should only be one backing index in normal circumstances
        old_backing_indexes = list(conn.indices.get_alias(name=default_alias).keys())
        for index in old_backing_indexes:
            actions.append({
                "remove": {
                    "index": index,
                    "alias": default_alias,
                }
            })
    actions.append({
        "add": {
            "index": backing_index,
            "alias": default_alias,
        },
    })
    conn.indices.update_aliases({
        "actions": actions
    })
    refresh_index(backing_index)
    for index in old_backing_indexes:
        conn.indices.delete(index)

    # Finally, remove the link to the reindexing alias
    conn.indices.delete_alias(name=get_reindexing_alias_name(), index=backing_index)

    log.info("recreate_index has finished successfully!")
