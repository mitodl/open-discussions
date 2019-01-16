"""Search task tests"""
# pylint: disable=redefined-outer-name,unused-argument

from django.conf import settings
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException, NotFound
import pytest

from channels.factories import ChannelFactory, PostFactory
from open_discussions.factories import UserFactory
from open_discussions.test_utils import assert_not_raises
from search.constants import POST_TYPE, COMMENT_TYPE, VALID_OBJECT_TYPES
from search.exceptions import ReindexException, RetryException
from search.tasks import (
    create_document,
    update_document_with_partial,
    finish_recreate_index,
    increment_document_integer_field,
    update_field_values_by_query,
    index_channel,
    index_post_with_comments,
    start_recreate_index,
    wrap_retry_exception,
    index_profiles,
)


pytestmark = pytest.mark.django_db


@pytest.fixture()
def wrap_retry_mock(mocker):
    """
    Patches the wrap_retry_exception context manager and asserts that it was
    called by any test that uses it
    """
    wrap_mock = mocker.patch("search.tasks.wrap_retry_exception")
    yield
    wrap_mock.assert_called_once_with(PrawcoreException, PRAWException)


@pytest.fixture()
def mocked_api(mocker):
    """Mock object that patches the channels API"""
    return mocker.patch("search.tasks.api")


def test_create_document_task(mocked_api):
    """Test that the create_document task calls the indexing API function with the right args"""
    indexing_api_args = ("doc_id", {"test": "data"})
    create_document(*indexing_api_args)
    assert mocked_api.create_document.call_count == 1
    assert mocked_api.create_document.call_args[0] == indexing_api_args


def test_update_document_with_partial_task(mocked_api):
    """Test that the create_document task calls the indexing API function with the right args"""
    indexing_api_args = ("doc_id", {"test": "data"}, COMMENT_TYPE)
    update_document_with_partial(*indexing_api_args)
    assert mocked_api.update_document_with_partial.call_count == 1
    assert mocked_api.update_document_with_partial.call_args[0] == indexing_api_args


def test_increment_document_integer_field_task(mocked_api):
    """
    Test that the increment_document_integer_field task calls the indexing
    API function with the right args
    """
    indexing_api_args = ("doc_id", {"test": "data"}, 1, POST_TYPE)
    increment_document_integer_field(*indexing_api_args)
    assert mocked_api.increment_document_integer_field.call_count == 1
    assert mocked_api.increment_document_integer_field.call_args[0] == indexing_api_args


def test_update_field_values_by_query(mocked_api):
    """
    Test that the update_field_values_by_query task calls the indexing
    API function with the right args
    """
    indexing_api_args = ({"query": {}}, {"field1": "value1"}, [POST_TYPE])
    update_field_values_by_query(*indexing_api_args)
    assert mocked_api.update_field_values_by_query.call_count == 1
    assert mocked_api.update_field_values_by_query.call_args[0] == indexing_api_args


@pytest.mark.parametrize("error", [KeyError, NotFound])
def test_wrap_retry_exception(error):
    """wrap_retry_exception should raise RetryException when other exceptions are raised"""
    with assert_not_raises():
        with wrap_retry_exception(error):
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


@pytest.mark.parametrize("with_error", [True, False])
def test_index_post_with_comments(
    mocker, wrap_retry_mock, with_error
):  # pylint: disable=unused-argument
    """index_post should call the api function of the same name"""
    index_post_mock = mocker.patch("search.indexing_api.index_post_with_comments")
    if with_error:
        index_post_mock.side_effect = TabError
    post_id = "post_id"
    result = index_post_with_comments.delay(post_id).get()
    assert result == (
        "index_post_with_comments threw an error on post post_id"
        if with_error
        else None
    )

    index_post_mock.assert_called_once_with(post_id)


@pytest.mark.parametrize("with_error", [True, False])
def test_index_channel(
    mock_index_functions, mocker, mocked_celery, settings, user, with_error
):  # pylint: disable=unused-argument,too-many-arguments
    """index_channel should index all posts of a channel"""
    settings.INDEXING_API_USERNAME = user.username
    index_post_mock = mocker.patch(
        "search.tasks.index_post_with_comments", autospec=True
    )
    channel = ChannelFactory.create(id=1, name="channel01")
    posts = PostFactory.create_batch(2, channel=channel)

    assert (
        index_channel.delay(channel.id).get()
        == f"index_channel threw an error on channel id {channel.id}"
    )

    assert mocked_celery.group.call_count == 1
    list(mocked_celery.group.call_args[0][0])  # iterate through generator
    assert index_post_mock.si.call_count == 2
    for post in posts:
        index_post_mock.si.assert_any_call(post.post_id)
    assert mocked_celery.replace.call_count == 1
    assert mocked_celery.replace.call_args[0][1] == mocked_celery.group.return_value


@pytest.mark.parametrize("with_error", [True, False])
def test_index_profiles(mocker, with_error):  # pylint: disable=unused-argument
    """index_post should call the api function of the same name"""
    index_profile_mock = mocker.patch("search.indexing_api.index_profiles")
    if with_error:
        index_profile_mock.side_effect = TabError
    result = index_profiles.delay([1, 2, 3]).get()
    assert result == ("index_profiles threw an error" if with_error else None)

    index_profile_mock.assert_called_once_with([1, 2, 3])


def test_start_recreate_index(mock_index_functions, mocker, mocked_celery, user):
    """
    recreate_index should recreate the elasticsearch index and reindex all data with it
    """
    settings.INDEXING_API_USERNAME = user.username
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 2
    users = sorted(UserFactory.create_batch(4), key=lambda user: user.id)
    channels = [ChannelFactory.create(name=name) for name in ["a", "b", "c"]]
    index_channel_mock = mocker.patch("search.tasks.index_channel", autospec=True)
    index_profiles_mock = mocker.patch("search.tasks.index_profiles", autospec=True)
    backing_index = "backing"
    create_backing_index_mock = mocker.patch(
        "search.indexing_api.create_backing_index",
        autospec=True,
        return_value=backing_index,
    )
    finish_recreate_index_mock = mocker.patch(
        "search.tasks.finish_recreate_index", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        start_recreate_index.delay()
    for doctype in VALID_OBJECT_TYPES:
        create_backing_index_mock.assert_any_call(doctype)
    finish_recreate_index_mock.s.assert_called_once_with(
        {"post": backing_index, "comment": backing_index, "profile": backing_index}
    )
    assert mocked_celery.group.call_count == 1

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])
    for channel in channels:
        index_channel_mock.si.assert_any_call(channel.id)
        mocked_celery.chain.assert_called_once_with(
            mocked_celery.group.return_value, finish_recreate_index_mock.s.return_value
        )
    index_profiles_mock.si.assert_any_call([users[0].profile.id, users[1].profile.id])
    index_profiles_mock.si.assert_any_call([users[2].profile.id, users[3].profile.id])
    assert mocked_celery.replace.call_count == 1
    assert mocked_celery.replace.call_args[0][1] == mocked_celery.chain.return_value


@pytest.mark.parametrize("with_error", [True, False])
def test_finish_recreate_index(mocker, with_error):
    """
    finish_recreate_index should attach the backing index to the default alias
    """
    backing_indices = {"post": "backing", "comment": "backing", "profile": "backing"}
    results = ["error"] if with_error else []
    switch_indices_mock = mocker.patch(
        "search.indexing_api.switch_indices", autospec=True
    )

    if with_error:
        with pytest.raises(ReindexException):
            finish_recreate_index.delay(results, backing_indices)
        assert switch_indices_mock.call_count == 0
    else:
        finish_recreate_index.delay(results, backing_indices)
        switch_indices_mock.assert_any_call("backing", POST_TYPE)
        switch_indices_mock.assert_any_call("backing", COMMENT_TYPE)
