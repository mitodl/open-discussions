"""Search task tests"""
# pylint: disable=redefined-outer-name
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException
import pytest

from open_discussions.utils import assert_not_raises
from search.exceptions import RetryException
from search.tasks import (
    create_document,
    update_document_with_partial,
    finish_recreate_index,
    increment_document_integer_field,
    index_channel,
    index_post_with_comments,
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
    with assert_not_raises():
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


def test_index_post_with_comments(mocker):
    """index_post should call the api function of the same name"""
    index_post_mock = mocker.patch('search.indexing_api.index_post_with_comments')
    wrap_mock = mocker.patch('search.tasks.wrap_retry_exception')
    post_id = 'post_id'
    index_post_with_comments.delay(post_id)

    index_post_mock.assert_called_once_with(post_id)
    wrap_mock.assert_called_once_with(PrawcoreException, PRAWException)


def test_index_channel(mocker, settings, user):
    """index_channel should index all posts of a channel"""
    settings.INDEXING_API_USERNAME = user.username
    index_post_mock = mocker.patch('search.tasks.index_post_with_comments', autospec=True)
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
        index_channel.delay(channel_name)

    api_mock.assert_called_once_with(user)
    get_channel_mock.assert_called_once_with(channel_name)

    wrap_mock.assert_called_once_with(PrawcoreException, PRAWException)
    assert group_mock.call_count == 1
    list(group_mock.call_args[0][0])  # iterate through generator
    index_post_mock.si.assert_any_call(post1.id)
    index_post_mock.si.assert_any_call(post2.id)
    replace_mock.assert_called_once_with(group_mock.return_value)


def test_start_recreate_index(mocker, settings, user):
    """
    recreate_index should recreate the elasticsearch index and reindex all data with it
    """
    settings.INDEXING_API_USERNAME = user.username
    client_mock = mocker.patch('channels.api.Api', autospec=True)
    channel_names = ['a', 'b', 'c']
    client_mock.return_value.list_channels.return_value = [
        mocker.Mock(display_name=name) for name in channel_names
    ]
    index_channel_mock = mocker.patch('search.tasks.index_channel', autospec=True)
    replace_mock = mocker.patch('celery.app.task.Task.replace', autospec=True, side_effect=TabError)
    group_mock = mocker.patch('search.tasks.group', autospec=True)
    chain_mock = mocker.patch('search.tasks.chain', autospec=True)
    backing_index = 'backing'
    create_backing_index_mock = mocker.patch(
        'search.indexing_api.create_backing_index',
        autospec=True,
        return_value=backing_index,
    )
    finish_recreate_index_mock = mocker.patch('search.tasks.finish_recreate_index', autospec=True)

    with pytest.raises(TabError):
        start_recreate_index.delay()

    create_backing_index_mock.assert_called_once_with()
    finish_recreate_index_mock.si.assert_called_once_with(backing_index)
    assert group_mock.call_count == 1
    list(group_mock.call_args[0][0])  # iterate through generator
    for name in channel_names:
        index_channel_mock.si.assert_any_call(name)
    chain_mock.assert_called_once_with(
        group_mock.return_value,
        finish_recreate_index_mock.si.return_value,
    )
    assert replace_mock.call_count == 1
    assert replace_mock.call_args[0][1] == chain_mock.return_value


def test_finish_recreate_index(mocker):
    """
    finish_recreate_index should attach the backing index to the default alias
    """
    backing_index = 'backing'
    switch_indices_mock = mocker.patch('search.indexing_api.switch_indices', autospec=True)
    finish_recreate_index.delay(backing_index)

    switch_indices_mock.assert_called_once_with(backing_index)
