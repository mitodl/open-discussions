"""
Tests for the indexing API
"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace
import pytest

from search.indexing_api import (
    create_document,
    update_document_with_partial,
    increment_document_integer_field,
    GLOBAL_DOC_TYPE,
)


@pytest.fixture()
def mocked_es(mocker, settings):
    """Mocked ES client objects/functions"""
    index_name = 'test'
    settings.ELASTICSEARCH_INDEX = index_name
    conn = mocker.Mock()
    get_conn_patch = mocker.patch('search.indexing_api.get_conn', return_value=conn)
    yield SimpleNamespace(get_conn=get_conn_patch, conn=conn, index_name=index_name)
    get_conn_patch.reset_mock()


def test_create_document(mocked_es):
    """
    Test that create_document gets a connection and calls the correct elasticsearch-dsl function
    """
    doc_id, data = ('doc_id', {'key1': 'value1'})
    create_document(doc_id, data)
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.create.assert_called_once_with(
        index=mocked_es.index_name,
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
        index=mocked_es.index_name,
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
        index=mocked_es.index_name,
        doc_type=GLOBAL_DOC_TYPE,
        body={
            "script": {
                "source": "ctx._source.{} += {}".format(field_name, incr_amount),
                "lang": "painless",
            }
        },
        id=doc_id,
    )
