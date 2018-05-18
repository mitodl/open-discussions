"""Search task tests"""
# pylint: disable=redefined-outer-name
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException
import pytest

from open_discussions.factories import UserFactory
from search.connection import (
    get_default_alias_name,
    get_reindexing_alias_name,
)
from search.exceptions import RetryException
from search.tasks import (
    create_document,
    update_document_with_partial,
    finish_recreate_index,
    increment_document_integer_field,
    index_channel,
    index_post,
    start_recreate_index,
    wrap_retry_exception,
)


pytestmark = pytest.mark.django_db


@pytest.fixture()
def mocked_api(mocker):
    """Mock object that patches the channels API"""
    return mocker.patch('search.tasks.api')


def test_create_document_task(mocked_api):
    """Test that the create_document task calls the indexing API function with the right args"""
    indexing_api_args = ('doc_id', {'test': 'data'})
    create_document(*indexing_api_args)
    assert mocked_api.create_document.call_count == 1
    assert mocked_api.create_document.call_args[0] == indexing_api_args


def test_update_document_with_partial_task(mocked_api):
    """Test that the create_document task calls the indexing API function with the right args"""
    indexing_api_args = ('doc_id', {'test': 'data'})
    update_document_with_partial(*indexing_api_args)
    assert mocked_api.update_document_with_partial.call_count == 1
    assert mocked_api.update_document_with_partial.call_args[0] == indexing_api_args


def test_increment_document_integer_field_task(mocked_api):
    """
    Test that the increment_document_integer_field task calls the indexing
    API function with the right args
    """
    indexing_api_args = ('doc_id', {'test': 'data'}, 1)
    increment_document_integer_field(*indexing_api_args)
    assert mocked_api.increment_document_integer_field.call_count == 1
    assert mocked_api.increment_document_integer_field.call_args[0] == indexing_api_args


def test_wrap_retry_exception():
    """wrap_retry_exception should raise RetryException when other exceptions are raised"""
    with wrap_retry_exception(KeyError):
        # Should not raise an exception
        pass


@pytest.mark.parametrize("matching", [True, False])
def test_wrap_retry_exception_matching(matching):
    """A matching exception should raise a RetryException"""

    class SubError(KeyError):
        """Use a subclass to assert isinstance use"""

    def raise_thing():
        """raise the exception"""
        if matching:
            raise SubError()
        else:
            raise TabError()

    matching_exception = RetryException if matching else TabError
    with pytest.raises(matching_exception):
        with wrap_retry_exception(KeyError):
            raise_thing()


def test_index_post(mocker):
    """index_post should call the api function of the same name"""
    index_post_mock = mocker.patch('search.indexing_api.index_post')
    wrap_mock = mocker.patch('search.tasks.wrap_retry_exception')
    api_username = 'username'
    post_id = 'post_id'
    index_post.delay(api_username, post_id)

    index_post_mock.assert_called_once_with(api_username, post_id)
    wrap_mock.assert_called_once_with(PrawcoreException, PRAWException)


def test_index_channel(mocker):
    """index_channel should all posts of a channel"""
    user = UserFactory.create()
    index_post_mock = mocker.patch('search.tasks.index_post', autospec=True)
    api_mock = mocker.patch('channels.api.Api', autospec=True)

    expected_exception = ZeroDivisionError

    replace_mock = mocker.patch('celery.app.task.Task.replace', return_value=expected_exception)
    group_mock = mocker.patch('search.tasks.group', autospec=True)
    get_channel_mock = api_mock.return_value.get_channel
    post1 = mocker.Mock(id=1)
    post2 = mocker.Mock(id=2)
    get_channel_mock.return_value.new.return_value = [
        post1,
        post2,
    ]
    wrap_mock = mocker.patch('search.tasks.wrap_retry_exception')
    channel_name = 'channel'
    with pytest.raises(expected_exception):
        index_channel.delay(user.username, channel_name)

    api_mock.assert_called_once_with(user)
    get_channel_mock.assert_called_once_with(channel_name)

    wrap_mock.assert_called_once_with(PrawcoreException, PRAWException)
    assert group_mock.call_count == 1
    list(group_mock.call_args[0][0])  # iterate through generator
    index_post_mock.si.assert_any_call(api_username=user.username, post_id=post1.id)
    index_post_mock.si.assert_any_call(api_username=user.username, post_id=post2.id)
    replace_mock.assert_called_once_with(group_mock.return_value)


# pylint: disable=too-many-locals
@pytest.mark.parametrize("temp_alias_exists", [True, False])
def test_start_recreate_index(mocker, temp_alias_exists):
    """
    recreate_index should recreate the elasticsearch index and reindex all data with it
    """
    user = UserFactory.create()
    client_mock = mocker.patch('channels.api.Api', autospec=True)
    channel_names = ['a', 'b', 'c']
    client_mock.return_value.list_channels.return_value = [
        mocker.Mock(display_name=name) for name in channel_names
    ]
    mocker.patch('search.indexing_api.get_conn', autospec=True)
    get_conn_mock = mocker.patch('search.tasks.get_conn', autospec=True)
    index_channel_mock = mocker.patch('search.tasks.index_channel', autospec=True)
    conn_mock = get_conn_mock.return_value
    conn_mock.indices.exists_alias.return_value = temp_alias_exists
    replace_mock = mocker.patch('celery.app.task.Task.replace', autospec=True, side_effect=TabError)
    group_mock = mocker.patch('search.tasks.group', autospec=True)
    chain_mock = mocker.patch('search.tasks.chain', autospec=True)
    clear_and_create_mock = mocker.patch('search.tasks.clear_and_create_index', autospec=True)
    finish_recreate_index_mock = mocker.patch('search.tasks.finish_recreate_index', autospec=True)

    with pytest.raises(TabError):
        start_recreate_index.delay(user.username)

    reindexing_alias = get_reindexing_alias_name()
    get_conn_mock.assert_called_once_with(verify=False)
    assert clear_and_create_mock.call_count == 1
    backing_index = clear_and_create_mock.call_args[1]['index_name']

    conn_mock.indices.exists_alias.assert_called_once_with(name=reindexing_alias)
    if temp_alias_exists:
        conn_mock.indices.delete_alias.assert_any_call(
            index="_all", name=reindexing_alias,
        )
    assert conn_mock.indices.delete_alias.called is temp_alias_exists

    conn_mock.indices.put_alias.assert_called_once_with(
        index=backing_index, name=reindexing_alias,
    )
    finish_recreate_index_mock.si.assert_called_once_with(backing_index)
    assert group_mock.call_count == 1
    list(group_mock.call_args[0][0])  # iterate through generator
    for name in channel_names:
        index_channel_mock.si.assert_any_call(api_username=user.username, channel_name=name)
    chain_mock.assert_called_once_with(
        group_mock.return_value,
        finish_recreate_index_mock.si.return_value,
    )
    assert replace_mock.call_count == 1
    assert replace_mock.call_args[0][1] == chain_mock.return_value


@pytest.mark.parametrize("default_exists", [True, False])
def test_finish_recreate_index(mocker, default_exists):
    """
    finish_recreate_index should attach the backing index to the default alias
    """
    refresh_mock = mocker.patch('search.tasks.refresh_index', autospec=True)
    get_conn_mock = mocker.patch('search.tasks.get_conn', autospec=True)
    conn_mock = get_conn_mock.return_value
    conn_mock.indices.exists_alias.return_value = default_exists
    old_backing_index = 'old_backing'
    conn_mock.indices.get_alias.return_value.keys.return_value = [old_backing_index]

    backing_index = 'backing'
    finish_recreate_index.delay(backing_index)

    conn_mock.indices.delete_alias.assert_any_call(
        name=get_reindexing_alias_name(),
        index=backing_index,
    )
    default_alias = get_default_alias_name()
    conn_mock.indices.exists_alias.assert_called_once_with(name=default_alias)

    actions = []
    if default_exists:
        actions.append({
            "remove": {
                "index": old_backing_index,
                "alias": default_alias,
            },
        })
    actions.append({
        "add": {
            "index": backing_index,
            "alias": default_alias,
        }
    })
    conn_mock.indices.update_aliases.assert_called_once_with({
        "actions": actions,
    })
    refresh_mock.assert_called_once_with(backing_index)
    if default_exists:
        conn_mock.indices.delete.assert_called_once_with(old_backing_index)
    else:
        assert conn_mock.indices.delete.called is False

    conn_mock.indices.delete_alias.assert_called_once_with(
        name=get_reindexing_alias_name(),
        index=backing_index,
    )
