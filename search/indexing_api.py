"""
Functions and constants for Elasticsearch indexing
"""
from functools import partial
from django.conf import settings

from search.connection import get_conn


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
    'post_link_url': {'type': 'text'},
    'num_comments': {'type': 'long'},
    'comment_id': {'type': 'keyword'},
    'parent_comment_id': {'type': 'keyword'},
}


def gen_post_id(reddit_obj_id):
    """Generates the Elasticsearch document id for a post"""
    return 'p_{}'.format(reddit_obj_id)


def clear_and_create_index(skip_mapping=False):
    """
    Wipe and recreate index and mapping. No indexing is done.

    Args:
        skip_mapping (bool): If true, don't set any mapping
    """
    conn = get_conn(verify=False)
    index_name = settings.ELASTICSEARCH_INDEX
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
    return conn.create(
        index=settings.ELASTICSEARCH_INDEX,
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
    return conn.update(
        index=settings.ELASTICSEARCH_INDEX,
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
