"""
Functions and constants for Elasticsearch indexing
"""
from functools import partial
import logging

from elasticsearch.helpers import bulk
from django.conf import settings
from django.contrib.auth import get_user_model

from search.connection import (
    get_active_aliases,
    get_conn,
    get_default_alias_name,
    get_reindexing_alias_name,
    make_backing_index_name,
    refresh_index,
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
        conn.create(
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
        conn.update(
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
    _update_document(
        doc_id,
        {
            "source": "ctx._source.{} += {}".format(field_name, incr_amount),
            "lang": "painless",
        },
        update_key='script'
    )


def index_post_with_comments(post_id):
    """
    Index a post and its comments

    Args:
        post_id (str): The post string
    """
    from channels.api import Api

    conn = get_conn()
    api_username = settings.INDEXING_API_USERNAME
    client = Api(User.objects.get(username=api_username))
    post = client.get_post(post_id)
    comments = post.comments
    # Make sure all morecomments are replaced before serializing
    comments.replace_more(limit=None)

    for alias in get_active_aliases():
        _, errors = bulk(
            conn,
            serialize_post_and_comments(post),
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            # Adjust chunk size from 500 depending on environment variable
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )
        if len(errors) > 0:
            raise ReindexException("Error during bulk insert: {errors}".format(
                errors=errors
            ))


def create_backing_index():
    """
    Start the reindexing process by creating a new backing index and pointing the reindex alias toward it

    Returns:
        str: The new backing index
    """
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

    return new_backing_index


def switch_indices(backing_index):
    """
    Switch the default index to point to the backing index, and delete the reindex alias

    Args:
        backing_index (str): The backing index of the reindex alias
    """
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
