"""
Tests for the indexing API
"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

import pytest

from elasticsearch.exceptions import ConflictError

from channels.models import Post, Comment
from search.connection import get_default_alias_name
from search.constants import POST_TYPE, COMMENT_TYPE, ALIAS_ALL_INDICES
from search.exceptions import ReindexException
from search.indexing_api import (
    clear_and_create_index,
    create_backing_index,
    create_document,
    update_field_values_by_query,
    get_reindexing_alias_name,
    update_document_with_partial,
    increment_document_integer_field,
    index_post_with_comments,
    switch_indices,
    GLOBAL_DOC_TYPE,
    SCRIPTING_LANG,
    UPDATE_CONFLICT_SETTING,
    sync_post, sync_comments)


pytestmark = pytest.mark.django_db


@pytest.fixture()
def mocked_es(mocker, settings):
    """Mocked ES client objects/functions"""
    index_name = 'test'
    settings.ELASTICSEARCH_INDEX = index_name
    conn = mocker.Mock()
    get_conn_patch = mocker.patch('search.indexing_api.get_conn', autospec=True, return_value=conn)
    mocker.patch('search.connection.get_conn', autospec=True)
    default_alias = get_default_alias_name(POST_TYPE)
    reindex_alias = get_reindexing_alias_name(POST_TYPE)
    yield SimpleNamespace(
        get_conn=get_conn_patch,
        conn=conn,
        index_name=index_name,
        default_alias=default_alias,
        reindex_alias=reindex_alias,
        active_aliases=[default_alias, reindex_alias],
    )


@pytest.mark.parametrize('object_type', [POST_TYPE, COMMENT_TYPE])
def test_create_document(mocked_es, mocker, object_type):
    """
    Test that create_document gets a connection and calls the correct elasticsearch-dsl function
    """
    doc_id, data = ('doc_id', {'object_type': object_type})
    mock_get_aliases = mocker.patch('search.indexing_api.get_active_aliases', return_value=[object_type])
    create_document(doc_id, data)
    mock_get_aliases.assert_called_once_with([object_type])
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.create.assert_any_call(
        index=object_type,
        doc_type=GLOBAL_DOC_TYPE,
        body=data,
        id=doc_id,
    )


@pytest.mark.parametrize('version_conflicts,expected_error_logged', [
    (0, False),
    (1, True),
])
def test_update_field_values_by_query(mocker, mocked_es, version_conflicts, expected_error_logged):
    """
    Tests that update_field_values_by_query gets a connection, calls the correct elasticsearch-dsl function,
    and logs an error if the results indicate version conflicts
    """
    patched_logger = mocker.patch('search.indexing_api.log')
    query, field_name, field_value = ({"query": None}, 'field1', 'value1')
    mocked_es.conn.update_by_query.return_value = {'version_conflicts': version_conflicts}
    update_field_values_by_query(query, field_name, field_value)

    mocked_es.get_conn.assert_called_once_with(verify=True)
    for alias in mocked_es.active_aliases:
        mocked_es.conn.update_by_query.assert_any_call(
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
    assert patched_logger.error.called is expected_error_logged


@pytest.mark.parametrize('object_type', [POST_TYPE, COMMENT_TYPE])
def test_update_document_with_partial(mocked_es, mocker, object_type):
    """
    Test that update_document_with_partial gets a connection and calls the correct elasticsearch-dsl function
    """
    mock_get_aliases = mocker.patch('search.indexing_api.get_active_aliases', return_value=[object_type])
    doc_id, data = ('doc_id', {'key1': 'value1'})
    update_document_with_partial(doc_id, data, object_type)
    mock_get_aliases.assert_called_once_with([object_type])
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.update.assert_called_once_with(
        index=object_type,
        doc_type=GLOBAL_DOC_TYPE,
        body={'doc': data},
        id=doc_id,
    )


def test_update_partial_conflict_logging(mocker, mocked_es):
    """
    Test that update_document_with_partial logs an error if a version conflict occurs
    """
    patched_logger = mocker.patch('search.indexing_api.log')
    doc_id, data = ('doc_id', {'key1': 'value1', 'object_type': POST_TYPE})
    mocked_es.conn.update.side_effect = ConflictError
    update_document_with_partial(doc_id, data, POST_TYPE)
    assert patched_logger.error.called is True


def test_increment_document_integer_field(mocked_es):
    """
    Test that increment_document_integer_field gets a connection and calls the
    correct elasticsearch-dsl function
    """
    doc_id, field_name, incr_amount = ('doc_id', 'some_field_name', 1)
    increment_document_integer_field(doc_id, field_name, incr_amount, POST_TYPE)
    mocked_es.get_conn.assert_called_once_with(verify=True)

    for alias in mocked_es.active_aliases:
        mocked_es.conn.update.assert_any_call(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            body={
                "script": {
                    "source": "ctx._source.{} += params.incr_amount".format(field_name),
                    "lang": SCRIPTING_LANG,
                    "params": {
                        "incr_amount": incr_amount
                    }
                }
            },
            id=doc_id,
        )


@pytest.mark.parametrize("object_type", [POST_TYPE, COMMENT_TYPE])
@pytest.mark.parametrize("skip_mapping", [True, False])
@pytest.mark.parametrize("already_exists", [True, False])
def test_clear_and_create_index(mocked_es, object_type, skip_mapping, already_exists):
    """
    clear_and_create_index should delete the index and create a new empty one with a mapping
    """
    index = 'index'

    conn = mocked_es.conn
    conn.indices.exists.return_value = already_exists

    clear_and_create_index(index_name=index, skip_mapping=skip_mapping, object_type=object_type)

    conn.indices.exists.assert_called_once_with(index)
    assert conn.indices.delete.called is already_exists
    if already_exists:
        conn.indices.delete.assert_called_once_with(index)

    assert conn.indices.create.call_count == 1
    assert conn.indices.create.call_args[0][0] == index
    body = conn.indices.create.call_args[1]['body']

    assert 'settings' in body
    assert 'mappings' not in body if skip_mapping else 'mappings' in body


@pytest.mark.parametrize("object_type", [None, 'fake'])
def test_clear_and_create_index_error(object_type):
    """
    clear_and_create_index should raise a TypeError if object_type is None or invalid
    """
    with pytest.raises(ValueError):
        clear_and_create_index(index_name='idx', skip_mapping=False, object_type=object_type)


def test_index_post_with_comments(mocked_es, mocker, settings, user):  # pylint:disable=too-many-locals
    """
    index_post should index the post and all comments recursively
    """
    aliases = ['a', 'b']

    get_alias_mock = mocker.patch('search.indexing_api.get_active_aliases', autospec=True, return_value=aliases)
    api_mock = mocker.patch('channels.api.Api', autospec=True)
    serialized_data_post = [
        {
            'object_type': POST_TYPE,
        }
    ]
    serialized_data_comments = [
        {
            'object_type': COMMENT_TYPE,
        }
    ]
    serialize_post_mock = mocker.patch(
        'search.indexing_api.serialize_bulk_post',
        autospec=True,
    )
    serialize_comments_mock = mocker.patch(
        'search.indexing_api.serialize_bulk_comments',
        autospec=True,
    )
    sync_post_mock = mocker.patch(
        'search.indexing_api.sync_post',
        autospec=True,
        return_value=serialized_data_post,
    )
    sync_comments_mock = mocker.patch(
        'search.indexing_api.sync_comments',
        autospec=True,
        return_value=serialized_data_comments,
    )
    bulk_mock = mocker.patch(
        'search.indexing_api.bulk', autospec=True, return_value=(0, []),
    )

    settings.INDEXING_API_USERNAME = user.username
    post_id = 'post_id'
    index_post_with_comments(post_id)

    get_alias_mock.assert_any_call([POST_TYPE])
    get_alias_mock.assert_any_call([COMMENT_TYPE])
    api_mock.assert_called_once_with(user)
    client = api_mock.return_value
    client.get_post.assert_called_once_with(post_id)
    post = client.get_post.return_value

    serialize_post_mock.assert_any_call(post)
    sync_post_mock.assert_any_call(serialize_post_mock.return_value)

    serialize_comments_mock.assert_any_call(post)
    sync_comments_mock.assert_any_call(serialize_comments_mock.return_value)

    post.comments.replace_more.assert_called_once_with(limit=None)
    for alias in aliases:
        bulk_mock.assert_any_call(
            mocked_es.conn,
            serialized_data_post,
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )


@pytest.mark.parametrize("error", [POST_TYPE, COMMENT_TYPE])
def test_index_post_with_comments_errors(mocked_es, mocker, error, settings, user):  # pylint: disable=unused-argument
    """ Test that a ReindexException is raised if an error occurs when indexing posts or comments"""
    settings.INDEXING_API_USERNAME = user.username
    aliases = ['a', 'b']
    mocker.patch('search.indexing_api.get_active_aliases', autospec=True, return_value=aliases)
    mocker.patch('channels.api.Api', autospec=True)
    bulk_mock = mocker.patch('search.indexing_api.bulk', autospec=True)

    if error == POST_TYPE:
        # search.indexing_api.bulk() processes post index on first run
        bulk_mock.side_effect = (({}, ['error']),)
    else:
        # search.indexing_api.bulk() processes comment index on third run
        bulk_mock.side_effect = (({}, []), ({}, []), ({}, ['error']))

    with pytest.raises(ReindexException):
        index_post_with_comments('post_id')


@pytest.mark.parametrize("object_type", [POST_TYPE, COMMENT_TYPE])
@pytest.mark.parametrize("default_exists", [True, False])
def test_switch_indices(mocked_es, mocker, default_exists, object_type):
    """
    switch_indices should atomically remove the old backing index
    for the default alias and replace it with the new one
    """
    refresh_mock = mocker.patch('search.indexing_api.refresh_index', autospec=True)
    conn_mock = mocked_es.conn
    conn_mock.indices.exists_alias.return_value = default_exists
    old_backing_index = 'old_backing'
    conn_mock.indices.get_alias.return_value.keys.return_value = [old_backing_index]

    backing_index = 'backing'
    switch_indices(backing_index, object_type)

    conn_mock.indices.delete_alias.assert_any_call(
        name=get_reindexing_alias_name(object_type),
        index=backing_index,
    )
    default_alias = get_default_alias_name(object_type)
    all_alias = get_default_alias_name(ALIAS_ALL_INDICES)
    conn_mock.indices.exists_alias.assert_called_once_with(name=default_alias)

    actions = []
    if default_exists:
        actions.extend([
            {
                "remove": {
                    "index": old_backing_index,
                    "alias": default_alias,
                },
            },
            {
                "remove": {
                    "index": old_backing_index,
                    "alias": all_alias,
                },
            }
        ])
    actions.extend([
        {
            "add": {
                "index": backing_index,
                "alias": default_alias,
            }
        },
        {
            "add": {
                "index": backing_index,
                "alias": all_alias,
            }
        }
    ])
    conn_mock.indices.update_aliases.assert_called_once_with({
        "actions": actions,
    })
    refresh_mock.assert_called_once_with(backing_index)
    if default_exists:
        conn_mock.indices.delete.assert_called_once_with(old_backing_index)
    else:
        assert conn_mock.indices.delete.called is False

    conn_mock.indices.delete_alias.assert_called_once_with(
        name=get_reindexing_alias_name(object_type),
        index=backing_index,
    )


@pytest.mark.parametrize("temp_alias_exists", [True, False])
def test_create_backing_index(mocked_es, mocker, temp_alias_exists):
    """create_backing_index should make a new backing index and set the reindex alias to point to it"""
    reindexing_alias = get_reindexing_alias_name(POST_TYPE)
    backing_index = 'backing_index'
    conn_mock = mocked_es.conn
    conn_mock.indices.exists_alias.return_value = temp_alias_exists
    get_alias = conn_mock.indices.get_alias
    get_alias.return_value = {backing_index: {'alias': {reindexing_alias: {}}}} if temp_alias_exists else {}
    clear_and_create_mock = mocker.patch('search.indexing_api.clear_and_create_index', autospec=True)
    make_backing_index_mock = mocker.patch('search.indexing_api.make_backing_index_name', return_value=backing_index)

    assert create_backing_index(POST_TYPE) == backing_index

    get_conn_mock = mocked_es.get_conn
    get_conn_mock.assert_called_once_with(verify=False)
    make_backing_index_mock.assert_called_once_with(POST_TYPE)
    clear_and_create_mock.assert_called_once_with(index_name=backing_index, object_type=POST_TYPE)

    conn_mock.indices.exists_alias.assert_called_once_with(name=reindexing_alias)
    if temp_alias_exists:
        conn_mock.indices.delete_alias.assert_any_call(
            index=backing_index, name=reindexing_alias,
        )
    assert conn_mock.indices.delete_alias.called is temp_alias_exists

    conn_mock.indices.put_alias.assert_called_once_with(
        index=backing_index, name=reindexing_alias,
    )


def test_sync_post():
    """Test that sync_post creates Post model objects"""
    serialized = [
        {
            'channel_title': 'a',
            'post_id': 'a1',
            'post_link_url': 'http://a1.edu'
        },
        {
            'channel_title': 'b',
            'post_id': 'b1',
            'post_link_url': 'http://b1.edu'
        },
    ]

    list(sync_post(serialized))
    for item in serialized:
        assert Post.objects.filter(post_id=item['post_id']).exists()


def test_sync_comments():
    """Test that sync_comments creates Comment model objects"""
    serialized = [
        {
            'channel_title': 'a',
            'post_id': 'a1',
            'comment_id': 'a1c',
            'parent_comment_id': None
        },
        {
            'channel_title': 'b',
            'post_id': 'b1',
            'comment_id': 'b1c',
            'parent_comment_id': 'a1c'
        },
    ]

    list(sync_comments(serialized))
    for item in serialized:
        assert Comment.objects.filter(comment_id=item['comment_id']).exists()
