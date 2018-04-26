"""
Functions and constants for Elasticsearch indexing
"""
from functools import partial
import logging

from elasticsearch.helpers import bulk
from django.contrib.auth import get_user_model

from search.connection import (
    get_active_aliases,
    get_conn,
)
from search.exceptions import ReindexException
from search.serializers import (
    serialize_post_and_comments,
)


log = logging.getLogger(__name__)
User = get_user_model()


GLOBAL_DOC_TYPE = '_doc'
COMBINED_MAPPING = {
    'object_type': {'type': 'keyword'},
    'author': {'type': 'keyword'},
    'channel_title': {'type': 'keyword'},
    'text': {'type': 'text'},
    'score': {'type': 'long'},
    'created': {'type': 'date'},
    'deleted': {'type': 'boolean'},
    'removed': {'type': 'boolean'},
    'post_id': {'type': 'keyword'},
    'post_title': {'type': 'text'},
    'post_link_url': {'type': 'keyword'},
    'num_comments': {'type': 'long'},
    'comment_id': {'type': 'keyword'},
    'parent_comment_id': {'type': 'keyword'},
}


def gen_post_id(reddit_obj_id):
    """Generates the Elasticsearch document id for a post"""
    return 'p_{}'.format(reddit_obj_id)


def clear_and_create_index(*, index_name=None, skip_mapping=False):
    """
    Wipe and recreate index and mapping. No indexing is done.

    Args:
        index_name (str): The name of the index to clear
        skip_mapping (bool): If true, don't set any mapping
    """
    conn = get_conn(verify=False)
    if conn.indices.exists(index_name):
        conn.indices.delete(index_name)
    index_create_data = {
        'settings': {
            'analysis': {
                'analyzer': {
                    'folding': {
                        'type': 'custom',
                        'tokenizer': 'standard',
                        'filter': [
                            'lowercase',
                            'asciifolding',  # remove accents if we use folding analyzer
                        ]
                    }
                }
            }
        }
    }
    if not skip_mapping:
        index_create_data['mappings'] = {
            GLOBAL_DOC_TYPE: {
                "properties": COMBINED_MAPPING
            }
        }
    # from https://www.elastic.co/guide/en/elasticsearch/guide/current/asciifolding-token-filter.html
    conn.indices.create(index_name, body=index_create_data)


def create_document(doc_id, data):
    """
    Makes a request to ES to create a new document

    Args:
        doc_id (str): The ES document id
        data (dict): Full ES document data
    """
    conn = get_conn(verify=True)
    for alias in get_active_aliases():
        return conn.create(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            body=data,
            id=doc_id,
        )


def _update_document(doc_id, data, update_key=None):
    """
    Makes a request to ES to update an existing document

    Args:
        doc_id (str): The ES document id
        data (dict): Full ES document data
    """
    conn = get_conn(verify=True)
    for alias in get_active_aliases():
        return conn.update(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            body={update_key: data},
            id=doc_id,
        )


update_document_with_partial = partial(_update_document, update_key='doc')


def increment_document_integer_field(doc_id, field_name, incr_amount):
    """
    Makes a request to ES to increment some integer field in a document

    Args:
        doc_id (str): The ES document id
        field_name (str): The name of the field to increment
        incr_amount (int): The amount to increment by
    """
    return _update_document(
        doc_id,
        {
            "source": "ctx._source.{} += {}".format(field_name, incr_amount),
            "lang": "painless",
        },
        update_key='script'
    )


def refresh_index(index):
    """
    Refresh the elasticsearch index

    Args:
        index (str): The elasticsearch index to refresh
    """
    get_conn().indices.refresh(index)


def index_post(api_username, post_id):
    """
    Index a post and its comments

    Args:
        api_username (str): The API username
        post_id (str): The post string
    """
    from channels.api import Api

    conn = get_conn()
    client = Api(User.objects.get(username=api_username))
    post = client.get_post(post_id)
    comments = post.comments
    comments.replace_more(limit=None)

    for alias in get_active_aliases():
        _, errors = bulk(
            conn,
            serialize_post_and_comments(post),
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            # Lower chunk size from default 500 to try to manage memory use
            chunk_size=100,
        )
        if len(errors) > 0:
            raise ReindexException("Error during bulk insert: {errors}".format(
                errors=errors
            ))
