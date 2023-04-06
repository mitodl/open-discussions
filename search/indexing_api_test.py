"""
Tests for the indexing API
"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

import pytest
from elasticsearch.exceptions import ConflictError, NotFoundError

from course_catalog.factories import (
    ContentFileFactory,
    CourseFactory,
    LearningResourceRunFactory,
)
from open_discussions.utils import chunks
from search import indexing_api
from search.api import gen_course_id
from search.connection import get_default_alias_name
from search.constants import ALIAS_ALL_INDICES, COMMENT_TYPE, GLOBAL_DOC_TYPE, POST_TYPE
from search.exceptions import ReindexException
from search.indexing_api import (
    SCRIPTING_LANG,
    UPDATE_CONFLICT_SETTING,
    clear_and_create_index,
    create_backing_index,
    create_document,
    delete_courses,
    delete_document,
    delete_run_content_files,
    get_reindexing_alias_name,
    increment_document_integer_field,
    index_course_content_files,
    index_run_content_files,
    switch_indices,
    update_document_with_partial,
    update_field_values_by_query,
    update_post,
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
    mock_get_aliases.assert_called_once_with(mocked_es.conn, object_types=[object_type])
    mocked_es.get_conn.assert_called_once_with()
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

    mocked_es.get_conn.assert_called_once_with()
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
    mock_get_aliases.assert_called_once_with(mocked_es.conn, object_types=[object_type])
    mocked_es.get_conn.assert_called_once_with()
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


def test_update_post(mocker):
    """Test that update_post serializes a Post object and updates the corresponding ES document"""
    fake_post = mocker.Mock(post_id="1")
    fake_serialized_post = mocker.Mock(data={"key": "value"})
    mock_update_document = mocker.patch(
        "search.indexing_api.update_document_with_partial"
    )
    mocker.patch(
        "search.indexing_api.OSPostSerializer", return_value=fake_serialized_post
    )

    update_post("abc", fake_post)
    assert mock_update_document.called is True
    assert mock_update_document.call_args[0] == (
        "abc",
        fake_serialized_post.data,
        POST_TYPE,
    )


def test_increment_document_integer_field(mocked_es):
    """
    Test that increment_document_integer_field gets a connection and calls the
    correct elasticsearch-dsl function
    """
    doc_id, field_name, incr_amount = ("doc_id", "some_field_name", 1)
    increment_document_integer_field(doc_id, field_name, incr_amount, POST_TYPE)
    mocked_es.get_conn.assert_called_once_with()

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
    get_conn_mock.assert_called_once_with()
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
@pytest.mark.parametrize("errors", ([], ["error"]))
@pytest.mark.parametrize(
    "indexing_func_name, serializing_func_name, object_type",
    [
        ("index_profiles", "serialize_bulk_profiles", "profile"),
        ("index_comments", "serialize_bulk_comments", "comment"),
        ("index_posts", "serialize_bulk_posts", "post"),
        ("index_courses", "serialize_bulk_courses", "course"),
        ("index_programs", "serialize_bulk_programs", "program"),
        ("index_user_lists", "serialize_bulk_user_lists", "userlist"),
        ("index_videos", "serialize_bulk_videos", "video"),
        ("index_podcasts", "serialize_bulk_podcasts", "podcast"),
        ("index_podcast_episodes", "serialize_bulk_podcast_episodes", "podcastepisode"),
    ],
)
@pytest.mark.parametrize("update_only", (True, False))
def test_index_functions(
    mocked_es,
    mocker,
    settings,
    errors,
    indexing_func_name,
    serializing_func_name,
    object_type,
    update_only,
):  # pylint: disable=too-many-arguments
    """
    index functions should call bulk with correct arguments
    """
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 3
    documents = ["doc1", "doc2", "doc3", "doc4", "doc5"]
    mock_get_aliases = mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a", "b"]
    )
    mocker.patch(
        f"search.indexing_api.{serializing_func_name}",
        autospec=True,
        return_value=(doc for doc in documents),
    )
    bulk_mock = mocker.patch(
        "search.indexing_api.bulk", autospec=True, return_value=(0, errors)
    )
    index_func = getattr(indexing_api, indexing_func_name)

    if errors:
        with pytest.raises(ReindexException):
            index_func([1, 2, 3], update_only)
    else:
        index_func([1, 2, 3], update_only)
        mock_get_aliases.assert_called_with(
            mocked_es.conn,
            object_types=[object_type],
            include_reindexing=(not update_only),
        )

        for alias in mock_get_aliases.return_value:
            for chunk in chunks(
                documents, chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE
            ):
                bulk_mock.assert_any_call(
                    mocked_es.conn,
                    chunk,
                    index=alias,
                    doc_type=GLOBAL_DOC_TYPE,
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )


@pytest.mark.usefixtures("indexing_user")
@pytest.mark.parametrize("errors", ([], ["error"]))
@pytest.mark.parametrize(
    "indexing_func_name, serializing_func_name, object_type",
    [
        ("delete_profiles", "serialize_bulk_profiles_for_deletion", "profile"),
        ("delete_programs", "serialize_bulk_programs_for_deletion", "program"),
        ("delete_user_lists", "serialize_bulk_user_lists_for_deletion", "userlist"),
        ("delete_podcasts", "serialize_bulk_podcasts_for_deletion", "podcast"),
        (
            "delete_podcast_episodes",
            "serialize_bulk_podcast_episodes_for_deletion",
            "podcastepisode",
        ),
        ("delete_videos", "serialize_bulk_videos_for_deletion", "video"),
        ("delete_courses", "serialize_bulk_courses_for_deletion", "course"),
    ],
)
def test_bulk_deletion_functions(
    mocked_es,
    mocker,
    settings,
    errors,
    indexing_func_name,
    serializing_func_name,
    object_type,
):  # pylint: disable=too-many-arguments
    """
    index deletion functions should call bulk with correct arguments
    """
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 3
    documents = ["doc1", "doc2", "doc3", "doc4", "doc5"]
    mock_get_aliases = mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a", "b"]
    )
    mocker.patch(
        f"search.indexing_api.{serializing_func_name}",
        autospec=True,
        return_value=(doc for doc in documents),
    )
    bulk_mock = mocker.patch(
        "search.indexing_api.bulk", autospec=True, return_value=(0, errors)
    )
    index_func = getattr(indexing_api, indexing_func_name)

    if errors:
        with pytest.raises(ReindexException):
            index_func([1, 2, 3])
    else:
        index_func([1, 2, 3])
        mock_get_aliases.assert_called_with(
            mocked_es.conn, object_types=[object_type], include_reindexing=False
        )

        for alias in mock_get_aliases.return_value:
            for chunk in chunks(
                documents, chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE
            ):
                bulk_mock.assert_any_call(
                    mocked_es.conn,
                    chunk,
                    index=alias,
                    doc_type=GLOBAL_DOC_TYPE,
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                )


@pytest.mark.usefixtures("indexing_user")
def test_bulk_content_file_deletion_on_course_deletion(mocker):
    """
    ES should delete content files on bulk  course deletion
    """
    mock_delete_run_content_files = mocker.patch(
        "search.indexing_api.delete_run_content_files", autospec=True
    )
    mocker.patch("search.indexing_api.delete_items", autospec=True)

    courses = CourseFactory.create_batch(2)
    delete_courses([course.id for course in courses])
    for course in courses:
        for run in course.runs.all():
            mock_delete_run_content_files.assert_any_call(run.id)


def test_delete_document(mocked_es, mocker):
    """
    ES should try deleting the specified document from the correct index
    """
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a"]
    )
    delete_document(1, "course")
    mocked_es.conn.delete.assert_called_with(
        index="a", doc_type=GLOBAL_DOC_TYPE, id=1, params={}
    )


def test_delete_document_not_found(mocked_es, mocker):
    """
    ES should try deleting the specified document from the correct index
    """
    patched_logger = mocker.patch("search.indexing_api.log")
    mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a"]
    )
    mocked_es.conn.delete.side_effect = NotFoundError
    delete_document(1, "course")
    assert patched_logger.debug.called is True


@pytest.mark.parametrize("update_only", (False, True))
def test_index_content_files(mocker, update_only):
    """
    ES should try indexing content files for all runs in a course
    """
    mock_index_run_content_files = mocker.patch(
        "search.indexing_api.index_run_content_files", autospec=True
    )
    courses = CourseFactory.create_batch(2)
    index_course_content_files([course.id for course in courses], update_only)
    for course in courses:
        for run in course.runs.all():
            mock_index_run_content_files.assert_any_call(run.id, update_only)


@pytest.mark.usefixtures("indexing_user")
@pytest.mark.parametrize(
    "indexing_func_name, doc, unpublished_only",
    [
        ["index_run_content_files", {"_id": "doc"}, None],
        ["delete_run_content_files", {"_id": "doc", "_op_type": "delete"}, True],
        ["delete_run_content_files", {"_id": "doc", "_op_type": "delete"}, False],
    ],
)
@pytest.mark.parametrize(
    "indexing_chunk_size, document_indexing_chunk_size", [[2, 3], [3, 2]]
)
@pytest.mark.parametrize("errors", ([], ["error"]))
def test_bulk_index_content_files(
    mocked_es,
    mocker,
    settings,
    errors,
    indexing_func_name,
    doc,
    unpublished_only,
    indexing_chunk_size,
    document_indexing_chunk_size,
):  # pylint: disable=too-many-arguments,too-many-locals
    """
    index functions for content files should call bulk with correct arguments
    """
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = indexing_chunk_size
    settings.ELASTICSEARCH_DOCUMENT_INDEXING_CHUNK_SIZE = document_indexing_chunk_size
    course = CourseFactory.create()
    run = LearningResourceRunFactory.create(content_object=course)
    content_files = ContentFileFactory.create_batch(5, run=run, published=True)
    deleted_content_file = ContentFileFactory.create_batch(5, run=run, published=False)
    mock_get_aliases = mocker.patch(
        "search.indexing_api.get_active_aliases", autospec=True, return_value=["a", "b"]
    )
    bulk_mock = mocker.patch(
        "search.indexing_api.bulk", autospec=True, return_value=(0, errors)
    )
    mocker.patch(
        "search.indexing_api.serialize_content_file_for_bulk",
        autospec=True,
        return_value=doc,
    )
    mocker.patch(
        "search.indexing_api.serialize_content_file_for_bulk_deletion",
        autospec=True,
        return_value=doc,
    )

    if indexing_func_name == "index_run_content_files":
        chunk_size = min(indexing_chunk_size, document_indexing_chunk_size)
    else:
        chunk_size = indexing_chunk_size

    if errors:
        index_func = getattr(indexing_api, indexing_func_name)

        with pytest.raises(ReindexException):
            index_func(run.id)
    else:
        if indexing_func_name == "index_run_content_files":
            index_run_content_files(run.id)
        else:
            delete_run_content_files(run.id, unpublished_only)

        if unpublished_only:
            content_files = deleted_content_file
        else:
            content_files = content_files + [deleted_content_file]

        for alias in mock_get_aliases.return_value:
            for chunk in chunks([doc for _ in content_files], chunk_size=chunk_size):
                bulk_mock.assert_any_call(
                    mocked_es.conn,
                    chunk,
                    index=alias,
                    doc_type=GLOBAL_DOC_TYPE,
                    chunk_size=settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE,
                    routing=gen_course_id(course.platform, course.course_id),
                )
