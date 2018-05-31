"""Search task tests"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException
import pytest

from channels.constants import POSTS_SORT_NEW
from channels.utils import ListingParams
from open_discussions.test_utils import assert_not_raises
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
def wrap_retry_mock(mocker):
    """
    Patches the wrap_retry_exception context manager and asserts that it was
    called by any test that uses it
    """
    wrap_mock = mocker.patch('search.tasks.wrap_retry_exception')
    yield
    wrap_mock.assert_called_once_with(PrawcoreException, PRAWException)


@pytest.fixture()
def mocked_celery(mocker):
    """Mock object that patches certain celery functions"""
    exception_class = TabError
    replace_mock = mocker.patch('celery.app.task.Task.replace', autospec=True, side_effect=exception_class)
    group_mock = mocker.patch('celery.group', autospec=True)
    chain_mock = mocker.patch('celery.chain', autospec=True)

    yield SimpleNamespace(
        replace=replace_mock,
        group=group_mock,
        chain=chain_mock,
        replace_exception_class=exception_class,
    )


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


def test_index_post_with_comments(mocker, wrap_retry_mock):  # pylint: disable=unused-argument
    """index_post should call the api function of the same name"""
    index_post_mock = mocker.patch('search.indexing_api.index_post_with_comments')
    post_id = 'post_id'
    index_post_with_comments.delay(post_id)

    index_post_mock.assert_called_once_with(post_id)


def test_index_channel(mocker, mocked_celery, wrap_retry_mock, settings, user):  # pylint: disable=unused-argument
    """index_channel should index all posts of a channel"""
    settings.INDEXING_API_USERNAME = user.username
    index_post_mock = mocker.patch('search.tasks.index_post_with_comments', autospec=True)
    api_mock = mocker.patch('channels.api.Api', autospec=True)

    list_posts_mock = api_mock.return_value.list_posts
    posts = [mocker.Mock(id=num) for num in (1, 2)]
    list_posts_mock.return_value = posts
    channel_name = 'channel'
    with pytest.raises(mocked_celery.replace_exception_class):
        index_channel.delay(channel_name)

    api_mock.assert_called_once_with(user)
    list_posts_mock.assert_called_once_with(channel_name, ListingParams(None, None, 0, POSTS_SORT_NEW))

    assert mocked_celery.group.call_count == 1
    list(mocked_celery.group.call_args[0][0])  # iterate through generator
    for post in posts:
        index_post_mock.si.assert_any_call(post.id)
    assert mocked_celery.replace.call_count == 1
    assert mocked_celery.replace.call_args[0][1] == mocked_celery.group.return_value


def test_start_recreate_index(mocker, mocked_celery, settings, user):
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
    backing_index = 'backing'
    create_backing_index_mock = mocker.patch(
        'search.indexing_api.create_backing_index',
        autospec=True,
        return_value=backing_index,
    )
    finish_recreate_index_mock = mocker.patch('search.tasks.finish_recreate_index', autospec=True)

    with pytest.raises(mocked_celery.replace_exception_class):
        start_recreate_index.delay()

    create_backing_index_mock.assert_called_once_with()
    finish_recreate_index_mock.si.assert_called_once_with(backing_index)
    assert mocked_celery.group.call_count == 1

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])
    for name in channel_names:
        index_channel_mock.si.assert_any_call(name)
        mocked_celery.chain.assert_called_once_with(
            mocked_celery.group.return_value,
            finish_recreate_index_mock.si.return_value,
        )
    assert mocked_celery.replace.call_count == 1
    assert mocked_celery.replace.call_args[0][1] == mocked_celery.chain.return_value


def test_finish_recreate_index(mocker):
    """
    finish_recreate_index should attach the backing index to the default alias
    """
    backing_index = 'backing'
    switch_indices_mock = mocker.patch('search.indexing_api.switch_indices', autospec=True)
    finish_recreate_index.delay(backing_index)

    switch_indices_mock.assert_called_once_with(backing_index)
