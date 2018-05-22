"""
Tests for the indexing API
"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

import pytest

from channels.constants import (
    COMMENT_TYPE,
    POST_TYPE,
)
from open_discussions.factories import UserFactory
from search.connection import get_default_alias_name
from search.indexing_api import (
    clear_and_create_index,
    create_document,
    update_document_with_partial,
    increment_document_integer_field,
    GLOBAL_DOC_TYPE,
    index_post_with_comments,
)


pytestmark = pytest.mark.django_db


@pytest.fixture()
def mocked_es(mocker, settings):
    """Mocked ES client objects/functions"""
    index_name = 'test'
    settings.ELASTICSEARCH_INDEX = index_name
    conn = mocker.Mock()
    get_conn_patch = mocker.patch('search.indexing_api.get_conn', autospec=True, return_value=conn)
    mocker.patch('search.connection.get_conn', autospec=True)
    yield SimpleNamespace(
        get_conn=get_conn_patch,
        conn=conn,
        index_name=index_name,
        default_alias=get_default_alias_name(),
    )
    get_conn_patch.reset_mock()


def test_create_document(mocked_es):
    """
    Test that create_document gets a connection and calls the correct elasticsearch-dsl function
    """
    doc_id, data = ('doc_id', {'key1': 'value1'})
    create_document(doc_id, data)
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.create.assert_called_once_with(
        index=mocked_es.default_alias,
        doc_type=GLOBAL_DOC_TYPE,
        body=data,
        id=doc_id,
    )


def test_partially_update_document(mocked_es):
    """
    Test that partially_update_document gets a connection and calls the correct elasticsearch-dsl function
    """
    doc_id, data = ('doc_id', {'key1': 'value1'})
    update_document_with_partial(doc_id, data)
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.update.assert_called_once_with(
        index=mocked_es.default_alias,
        doc_type=GLOBAL_DOC_TYPE,
        body={'doc': data},
        id=doc_id,
    )


def test_increment_document_integer_field(mocked_es):
    """
    Test that increment_document_integer_field gets a connection and calls the
    correct elasticsearch-dsl function
    """
    doc_id, field_name, incr_amount = ('doc_id', 'some_field_name', 1)
    increment_document_integer_field(doc_id, field_name, incr_amount)
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.update.assert_called_once_with(
        index=mocked_es.default_alias,
        doc_type=GLOBAL_DOC_TYPE,
        body={
            "script": {
                "source": "ctx._source.{} += {}".format(field_name, incr_amount),
                "lang": "painless",
            }
        },
        id=doc_id,
    )


@pytest.mark.parametrize("skip_mapping", [True, False])
@pytest.mark.parametrize("already_exists", [True, False])
def test_clear_and_create_index(mocked_es, skip_mapping, already_exists):
    """
    clear_and_create_index should delete the index and create a new empty one with a mapping
    """
    index = 'index'

    conn = mocked_es.conn
    conn.indices.exists.return_value = already_exists

    clear_and_create_index(index_name=index, skip_mapping=skip_mapping)

    conn.indices.exists.assert_called_once_with(index)
    assert conn.indices.delete.called is already_exists
    if already_exists:
        conn.indices.delete.assert_called_once_with(index)

    assert conn.indices.create.call_count == 1
    assert conn.indices.create.call_args[0][0] == index
    body = conn.indices.create.call_args[1]['body']

    assert 'settings' in body
    assert 'mappings' not in body if skip_mapping else 'mappings' in body


def test_index_post_with_comments(mocked_es, mocker, settings):
    """
    index_post should index the post and all comments recursively
    """
    aliases = ['a', 'b']

    get_alias_mock = mocker.patch('search.indexing_api.get_active_aliases', autospec=True, return_value=aliases)
    api_mock = mocker.patch('channels.api.Api', autospec=True)
    serialized_data = [
        {
            'type': POST_TYPE,
        },
        {
            'type': COMMENT_TYPE,
        },
    ]
    serialize_mock = mocker.patch(
        'search.indexing_api.serialize_post_and_comments',
        autospec=True,
        return_value=serialized_data,
    )
    bulk_mock = mocker.patch(
        'search.indexing_api.bulk', autospec=True, return_value=(0, []),
    )

    user = UserFactory.create()
    settings.INDEXING_API_USERNAME = user.username
    post_id = 'post_id'
    index_post_with_comments(post_id)

    get_alias_mock.assert_called_once_with()
    api_mock.assert_called_once_with(user)
    client = api_mock.return_value
    client.get_post.assert_called_once_with(post_id)
    post = client.get_post.return_value

    serialize_mock.assert_any_call(post)

    post.comments.replace_more.assert_called_once_with(limit=None)
    for alias in aliases:
        bulk_mock.assert_any_call(
            mocked_es.conn,
            serialized_data,
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )
