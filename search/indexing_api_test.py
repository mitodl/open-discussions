"""
Tests for the indexing API
"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

import pytest

from elasticsearch.exceptions import ConflictError

from channels.factories.models import PostFactory, CommentFactory
from search.connection import get_default_alias_name
from search.constants import POST_TYPE, COMMENT_TYPE, ALIAS_ALL_INDICES, GLOBAL_DOC_TYPE
from search.exceptions import ReindexException
from search.indexing_api import (
    clear_and_create_index,
    create_backing_index,
    create_document,
    update_field_values_by_query,
    get_reindexing_alias_name,
    update_document_with_partial,
    increment_document_integer_field,
    index_posts,
    index_comments,
    switch_indices,
    SCRIPTING_LANG,
    UPDATE_CONFLICT_SETTING,
    index_courses,
    index_profiles,
    delete_document,
)

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("mocked_es")]


@pytest.fixture()
def mocked_es(mocker, settings):
    """Mocked ES client objects/functions"""
    index_name = "test"
    settings.ELASTICSEARCH_INDEX = index_name
    conn = mocker.Mock()
    get_conn_patch = mocker.patch(
        "search.indexing_api.get_conn", autospec=True, return_value=conn
    )
    mocker.patch("search.connection.get_conn", autospec=True)
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


@pytest.mark.parametrize("object_type", [POST_TYPE, COMMENT_TYPE])
def test_create_document(mocked_es, mocker, object_type):
    """
    Test that create_document gets a connection and calls the correct elasticsearch-dsl function
    """
    doc_id, data = ("doc_id", {"object_type": object_type})
    mock_get_aliases = mocker.patch(
        "search.indexing_api.get_active_aliases", return_value=[object_type]
    )
    create_document(doc_id, data)
    mock_get_aliases.assert_called_once_with([object_type])
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.create.assert_any_call(
        index=object_type, doc_type=GLOBAL_DOC_TYPE, body=data, id=doc_id
    )


@pytest.mark.parametrize(
    "version_conflicts,expected_error_logged", [(0, False), (1, True)]
)
def test_update_field_values_by_query(
    mocker, mocked_es, version_conflicts, expected_error_logged
):
    """
    Tests that update_field_values_by_query gets a connection, calls the correct elasticsearch-dsl function,
    and logs an error if the results indicate version conflicts
    """
    patched_logger = mocker.patch("search.indexing_api.log")
    query, field_name, field_value = ({"query": None}, "field1", "value1")
    new_value_param = "new_value_{}".format(field_name)
    mocked_es.conn.update_by_query.return_value = {
        "version_conflicts": version_conflicts
    }
    update_field_values_by_query(query, {field_name: field_value})

    mocked_es.get_conn.assert_called_once_with(verify=True)
    for alias in mocked_es.active_aliases:
        mocked_es.conn.update_by_query.assert_any_call(
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            conflicts=UPDATE_CONFLICT_SETTING,
            body={
                "script": {
                    "source": "ctx._source['{}'] = params.{}".format(
                        field_name, new_value_param
                    ),
                    "lang": SCRIPTING_LANG,
                    "params": {new_value_param: field_value},
                },
                **query,
            },
        )
    assert patched_logger.error.called is expected_error_logged


@pytest.mark.parametrize("object_type", [POST_TYPE, COMMENT_TYPE])
def test_update_document_with_partial(mocked_es, mocker, object_type):
    """
    Test that update_document_with_partial gets a connection and calls the correct elasticsearch-dsl function
    """
    mock_get_aliases = mocker.patch(
        "search.indexing_api.get_active_aliases", return_value=[object_type]
    )
    doc_id, data = ("doc_id", {"key1": "value1"})
    update_document_with_partial(doc_id, data, object_type)
    mock_get_aliases.assert_called_once_with([object_type])
    mocked_es.get_conn.assert_called_once_with(verify=True)
    mocked_es.conn.update.assert_called_once_with(
        index=object_type,
        doc_type=GLOBAL_DOC_TYPE,
        body={"doc": data},
        id=doc_id,
        params={"retry_on_conflict": 0},
    )


def test_update_partial_conflict_logging(mocker, mocked_es):
    """
    Test that update_document_with_partial logs an error if a version conflict occurs
    """
    patched_logger = mocker.patch("search.indexing_api.log")
    doc_id, data = ("doc_id", {"key1": "value1", "object_type": POST_TYPE})
    mocked_es.conn.update.side_effect = ConflictError
    update_document_with_partial(doc_id, data, POST_TYPE)
    assert patched_logger.error.called is True


def test_increment_document_integer_field(mocked_es):
    """
    Test that increment_document_integer_field gets a connection and calls the
    correct elasticsearch-dsl function
    """
    doc_id, field_name, incr_amount = ("doc_id", "some_field_name", 1)
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
                    "params": {"incr_amount": incr_amount},
                }
            },
            id=doc_id,
            params={"retry_on_conflict": 0},
        )


@pytest.mark.parametrize("object_type", [POST_TYPE, COMMENT_TYPE])
@pytest.mark.parametrize("skip_mapping", [True, False])
@pytest.mark.parametrize("already_exists", [True, False])
def test_clear_and_create_index(mocked_es, object_type, skip_mapping, already_exists):
    """
    clear_and_create_index should delete the index and create a new empty one with a mapping
    """
    index = "index"

    conn = mocked_es.conn
    conn.indices.exists.return_value = already_exists

    clear_and_create_index(
        index_name=index, skip_mapping=skip_mapping, object_type=object_type
    )

    conn.indices.exists.assert_called_once_with(index)
    assert conn.indices.delete.called is already_exists
    if already_exists:
        conn.indices.delete.assert_called_once_with(index)

    assert conn.indices.create.call_count == 1
    assert conn.indices.create.call_args[0][0] == index
    body = conn.indices.create.call_args[1]["body"]

    assert "settings" in body
    assert "mappings" not in body if skip_mapping else "mappings" in body


@pytest.mark.parametrize("object_type", [None, "fake"])
def test_clear_and_create_index_error(object_type):
    """
    clear_and_create_index should raise a TypeError if object_type is None or invalid
    """
    with pytest.raises(ValueError):
        clear_and_create_index(
            index_name="idx", skip_mapping=False, object_type=object_type
        )


@pytest.mark.usefixtures("indexing_user")
def test_index_posts(mocked_es, mocker, settings):
    """
    index_post should index all posts
    """
    aliases = ["a", "b"]

    posts = PostFactory.create_batch(3)

    get_alias_mock = mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=aliases
    )
    serialized_data_posts = [{"object_type": POST_TYPE} for _ in posts]
    mocker.patch(
        "search.indexing_api.serialize_bulk_posts",
        autospec=True,
        return_value=serialized_data_posts,
    )
    bulk_mock = mocker.patch(
        "search.indexing_api.bulk", autospec=True, return_value=(0, [])
    )

    index_posts([post.id for post in posts])

    get_alias_mock.assert_any_call([POST_TYPE])

    assert bulk_mock.call_count == 2
    for alias in aliases:
        # expect a call per object per alias
        bulk_mock.assert_any_call(
            mocked_es.conn,
            serialized_data_posts,
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )


@pytest.mark.usefixtures("indexing_user")
def test_index_posts_errors(mocker):
    """ Test that a ReindexException is raised if an error occurs when indexing posts or comments"""
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a", "b"]
    )
    mocker.patch(
        "search.indexing_api.bulk", autospec=True, side_effect=(({}, ["error"]),)
    )

    with pytest.raises(ReindexException):
        index_posts("post_id")


@pytest.mark.usefixtures("indexing_user")
def test_index_comments(mocked_es, mocker, settings):
    """
    index_comments should index all comments
    """
    aliases = ["a", "b"]
    comments = CommentFactory.create_batch(3)

    get_alias_mock = mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=aliases
    )
    serialized_data_comments = [{"object_type": COMMENT_TYPE} for _ in comments]
    mocker.patch(
        "search.indexing_api.serialize_bulk_comments",
        autospec=True,
        return_value=serialized_data_comments,
    )
    bulk_mock = mocker.patch(
        "search.indexing_api.bulk", autospec=True, return_value=(0, [])
    )

    index_comments([comment.id for comment in comments])

    get_alias_mock.assert_any_call([COMMENT_TYPE])

    assert bulk_mock.call_count == 2
    for alias in aliases:
        # expect a call per object per alias
        bulk_mock.assert_any_call(
            mocked_es.conn,
            serialized_data_comments,
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )


@pytest.mark.usefixtures("indexing_user")
def test_index_comments_errors(mocker):
    """ Test that a ReindexException is raised if an error occurs when indexing comments"""
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a", "b"]
    )
    mocker.patch(
        "search.indexing_api.bulk", autospec=True, side_effect=(({}, ["error"]),)
    )

    with pytest.raises(ReindexException):
        index_comments("comment_id")


@pytest.mark.usefixtures("indexing_user")
def test_index_profiles(mocked_es, mocker, settings):
    """
    index_profiles should call bulk with correct arguments
    """
    aliases = ["a", "b"]
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=aliases
    )
    mock_serialize_profiles = mocker.patch(
        "search.indexing_api.serialize_bulk_profiles",
        return_value=[{"author_id": "testuser1"}, {"author_id": "testuser2"}],
    )
    mocker.patch("channels.api.Api", autospec=True)
    bulk_mock = mocker.patch(
        "search.indexing_api.bulk", autospec=True, return_value=(0, [])
    )
    index_profiles([1, 2, 3])
    for alias in aliases:
        bulk_mock.assert_any_call(
            mocked_es.conn,
            mock_serialize_profiles.return_value,
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )


@pytest.mark.usefixtures("indexing_user")
def test_index_profiles_error(mocker):
    """
    index_profiles should raise a ReindexException if the bulk call fails
    """
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a"]
    )
    mocker.patch("search.indexing_api.serialize_bulk_profiles")
    mocker.patch("search.indexing_api.bulk", autospec=True, return_value=(0, ["error"]))
    with pytest.raises(ReindexException):
        index_profiles([1, 2, 3])


@pytest.mark.parametrize("object_type", [POST_TYPE, COMMENT_TYPE])
@pytest.mark.parametrize("default_exists", [True, False])
def test_switch_indices(mocked_es, mocker, default_exists, object_type):
    """
    switch_indices should atomically remove the old backing index
    for the default alias and replace it with the new one
    """
    refresh_mock = mocker.patch("search.indexing_api.refresh_index", autospec=True)
    conn_mock = mocked_es.conn
    conn_mock.indices.exists_alias.return_value = default_exists
    old_backing_index = "old_backing"
    conn_mock.indices.get_alias.return_value.keys.return_value = [old_backing_index]

    backing_index = "backing"
    switch_indices(backing_index, object_type)

    conn_mock.indices.delete_alias.assert_any_call(
        name=get_reindexing_alias_name(object_type), index=backing_index
    )
    default_alias = get_default_alias_name(object_type)
    all_alias = get_default_alias_name(ALIAS_ALL_INDICES)
    conn_mock.indices.exists_alias.assert_called_once_with(name=default_alias)

    actions = []
    if default_exists:
        actions.extend(
            [
                {"remove": {"index": old_backing_index, "alias": default_alias}},
                {"remove": {"index": old_backing_index, "alias": all_alias}},
            ]
        )
    actions.extend(
        [
            {"add": {"index": backing_index, "alias": default_alias}},
            {"add": {"index": backing_index, "alias": all_alias}},
        ]
    )
    conn_mock.indices.update_aliases.assert_called_once_with({"actions": actions})
    refresh_mock.assert_called_once_with(backing_index)
    if default_exists:
        conn_mock.indices.delete.assert_called_once_with(old_backing_index)
    else:
        assert conn_mock.indices.delete.called is False

    conn_mock.indices.delete_alias.assert_called_once_with(
        name=get_reindexing_alias_name(object_type), index=backing_index
    )


@pytest.mark.parametrize("temp_alias_exists", [True, False])
def test_create_backing_index(mocked_es, mocker, temp_alias_exists):
    """create_backing_index should make a new backing index and set the reindex alias to point to it"""
    reindexing_alias = get_reindexing_alias_name(POST_TYPE)
    backing_index = "backing_index"
    conn_mock = mocked_es.conn
    conn_mock.indices.exists_alias.return_value = temp_alias_exists
    get_alias = conn_mock.indices.get_alias
    get_alias.return_value = (
        {backing_index: {"alias": {reindexing_alias: {}}}} if temp_alias_exists else {}
    )
    clear_and_create_mock = mocker.patch(
        "search.indexing_api.clear_and_create_index", autospec=True
    )
    make_backing_index_mock = mocker.patch(
        "search.indexing_api.make_backing_index_name", return_value=backing_index
    )

    assert create_backing_index(POST_TYPE) == backing_index

    get_conn_mock = mocked_es.get_conn
    get_conn_mock.assert_called_once_with(verify=False)
    make_backing_index_mock.assert_called_once_with(POST_TYPE)
    clear_and_create_mock.assert_called_once_with(
        index_name=backing_index, object_type=POST_TYPE
    )

    conn_mock.indices.exists_alias.assert_called_once_with(name=reindexing_alias)
    if temp_alias_exists:
        conn_mock.indices.delete_alias.assert_any_call(
            index=backing_index, name=reindexing_alias
        )
    assert conn_mock.indices.delete_alias.called is temp_alias_exists

    conn_mock.indices.put_alias.assert_called_once_with(
        index=backing_index, name=reindexing_alias
    )


@pytest.mark.usefixtures("indexing_user")
def test_index_courses(mocked_es, mocker, settings):
    """
    index_courses should call bulk with correct arguments
    """
    aliases = ["a", "b"]
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=aliases
    )
    mock_serialize_courses = mocker.patch(
        "search.indexing_api.serialize_bulk_courses",
        return_value=[{"course_id": "MITx.001"}, {"course_id": "MITX.002"}],
    )
    mocker.patch("channels.api.Api", autospec=True)
    bulk_mock = mocker.patch(
        "search.indexing_api.bulk", autospec=True, return_value=(0, [])
    )
    index_courses([1, 2, 3])
    for alias in aliases:
        bulk_mock.assert_any_call(
            mocked_es.conn,
            mock_serialize_courses.return_value,
            index=alias,
            doc_type=GLOBAL_DOC_TYPE,
            chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
        )


@pytest.mark.usefixtures("indexing_user")
def test_index_courses_error(mocked_es, mocker):  # pylint:disable=unused-argument
    """
    index_courses should raise a ReindexException if the bulk call fails
    """
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a"]
    )
    mocker.patch("search.indexing_api.serialize_bulk_courses")
    mocker.patch("search.indexing_api.bulk", autospec=True, return_value=(0, ["error"]))
    with pytest.raises(ReindexException):
        index_courses([1, 2, 3])


def test_delete_document(mocked_es, mocker):
    """
    ES should try deleting the specified document from the correct index
    """
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a"]
    )
    delete_document(1, "course")
    mocked_es.conn.delete.assert_called_with(index="a", doc_type=GLOBAL_DOC_TYPE, id=1)
