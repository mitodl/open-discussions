"""
Functions and constants for Elasticsearch indexing
"""
from functools import partial
import logging

from elasticsearch.helpers import bulk
from elasticsearch.exceptions import ConflictError
from django.conf import settings
from django.contrib.auth import get_user_model

from channels.constants import (
    COMMENT_TYPE,
    POST_TYPE,
)
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
    serialize_bulk_post_and_comments,
)


log = logging.getLogger(__name__)
User = get_user_model()


GLOBAL_DOC_TYPE = '_doc'
SCRIPTING_LANG = 'painless'
UPDATE_CONFLICT_SETTING = 'proceed'
COMBINED_MAPPING = {
    'object_type': {'type': 'keyword'},
    'author_id': {'type': 'keyword'},
    'author_name': {'type': 'keyword'},
    'channel_title': {'type': 'keyword'},
    'text': {'type': 'text'},
    'score': {'type': 'long'},
    'created': {'type': 'date'},
    'deleted': {'type': 'boolean'},
    'removed': {'type': 'boolean'},
    'parent_post_removed': {'type': 'boolean'},
    'post_id': {'type': 'keyword'},
    'post_title': {'type': 'text'},
    'post_link_url': {'type': 'keyword'},
    'post_link_thumbnail': {'type': 'keyword'},
    'num_comments': {'type': 'long'},
    'comment_id': {'type': 'keyword'},
    'parent_comment_id': {'type': 'keyword'},
}


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


def update_field_values_by_query(query, field_name, field_value):
    """
    Makes a request to ES to use the update_by_query API to update a single field
    value for all documents that match the given query.

    Args:
        query (dict): A dict representing an ES query
        field_name (str): The name of the field that will be update
        field_value: The field value to set for all matching documents
    """
    conn = get_conn(verify=True)
    for alias in get_active_aliases():
        es_response = conn.update_by_query(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            conflicts=UPDATE_CONFLICT_SETTING,
            body={
                "script": {
                    "source": "ctx._source.{} = params.new_value".format(field_name),
                    "lang": SCRIPTING_LANG,
                    "params": {
                        "new_value": field_value
                    },
                },
                **query
            },
        )
        # Our policy for document update-related version conflicts right now is to log them
        # and allow the app to continue as normal.
        num_version_conflicts = es_response.get('version_conflicts', 0)
        if num_version_conflicts > 0:
            log.error(
                'Update By Query API request resulted in %s verson conflict(s) (alias: %s, query: %s)',
                num_version_conflicts,
                alias,
                query
            )


def _update_document_by_id(doc_id, data, update_key=None):
    """
    Makes a request to ES to update an existing document

    Args:
        doc_id (str): The ES document id
        data (dict): Full ES document data
        update_key (str): A key indicating the type of update request to Elasticsearch
            (e.g.: 'script', 'doc')
    """
    conn = get_conn(verify=True)
    for alias in get_active_aliases():
        try:
            conn.update(
                index=alias,
                doc_type=GLOBAL_DOC_TYPE,
                body={update_key: data},
                id=doc_id,
            )
        # Our policy for document update-related version conflicts right now is to log them
        # and allow the app to continue as normal.
        except ConflictError:
            log.error(
                'Update API request resulted in a version conflict (alias: %s, doc id: %s)',
                alias,
                doc_id
            )


update_document_with_partial = partial(_update_document_by_id, update_key='doc')


def increment_document_integer_field(doc_id, field_name, incr_amount):
    """
    Makes a request to ES to increment some integer field in a document

    Args:
        doc_id (str): The ES document id
        field_name (str): The name of the field to increment
        incr_amount (int): The amount to increment by
    """
    _update_document_by_id(
        doc_id,
        {
            "source": "ctx._source.{} += params.incr_amount".format(field_name),
            "lang": SCRIPTING_LANG,
            "params": {
                "incr_amount": incr_amount
            }
        },
        update_key='script'
    )


def sync_post_and_comments(serialized):
    """
    Sync posts and comments in serialized data

    Args:
        serialized (iterable of dict): An iterable of serialized elasticsearch documents

    Returns:
         iterable of dict: Passes through the serialized data unaltered
    """
    from channels.api import sync_post_model, sync_comment_model

    for item in serialized:
        if item['object_type'] == POST_TYPE:
            sync_post_model(
                channel_name=item['channel_title'],
                post_id=item['post_id'],
                post_url=item['post_link_url']
            )
        elif item['object_type'] == COMMENT_TYPE:
            sync_comment_model(
                channel_name=item['channel_title'],
                post_id=item['post_id'],
                comment_id=item['comment_id'],
                parent_id=item['parent_comment_id'],
            )
        yield item


def index_post_with_comments(post_id):
    """
    Index a post and its comments

    Args:
        post_id (str): The post string
    """
    from channels.api import Api

    conn = get_conn()
    api_user = User.objects.get(username=settings.INDEXING_API_USERNAME)
    client = Api(api_user)
    post = client.get_post(post_id)
    comments = post.comments
    # Make sure all morecomments are replaced before serializing
    comments.replace_more(limit=None)

    for alias in get_active_aliases():
        _, errors = bulk(
            conn,
            sync_post_and_comments(serialize_bulk_post_and_comments(post)),
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
        indices = conn.indices.get_alias(temp_alias).keys()
        for index in indices:
            conn.indices.delete_alias(index=index, name=temp_alias)

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
