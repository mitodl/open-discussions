"""Indexing tasks"""
import logging
from elasticsearch.exceptions import NotFoundError

from search import indexing_api as api
from open_discussions.celery import app


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
