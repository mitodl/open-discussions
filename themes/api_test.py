"""API tests"""
# pylint: disable=redefined-outer-name
import pytest

from mit_open.factories import UserFactory
from themes import api

pytestmark = pytest.mark.django_db


@pytest.fixture()
def mock_get_client(mocker):
    """Mock reddit get_client"""
    return mocker.patch('themes.api._get_client')


@pytest.fixture()
def mock_client(mock_get_client):
    """Mock reddit client"""
    return mock_get_client.return_value


@pytest.mark.parametrize('create_user', [True, False])
def test_get_theme_user(mock_get_client, create_user):
    """Test get_themes for logged-in user"""
    user = UserFactory.create() if create_user else None
    api.Api(user=user).get_theme('test')
    assert mock_get_client.called_once_with(user=user)
    assert mock_get_client.return_value.subreddit.called_once_with('test')


def test_list_themes_user(mock_get_client):
    """Test list_themes for logged-in user"""
    user = UserFactory.create()
    api.Api(user=user).list_themes()
    assert mock_get_client.called_once_with(user=user)
    assert mock_get_client.return_value.user.subreddits.called_once_with()


def test_list_themes_no_user(mock_get_client):
    """Test list_themes for anonymous user"""
    api.Api().list_themes()
    assert mock_get_client.called_once_with()
    assert mock_get_client.return_value.subreddits.default.called_once_with()


@pytest.mark.parametrize('theme_type', api.VALID_THEME_TYPES)
def test_create_theme_user(mock_get_client, theme_type):
    """Test create_theme for logged-in user"""
    user = UserFactory.create()
    api.Api(user=user).create_theme('name', 'Title', theme_type=theme_type)
    assert mock_get_client.called_once_with(user=user)
    assert mock_get_client.return_value.subreddit.create.called_once_with(
        'name', 'Title', subreddit_type=theme_type
    )


@pytest.mark.parametrize('theme_setting', api.THEME_SETTINGS)
def test_create_theme_setting(mock_client, theme_setting):
    """Test create_theme for {theme_setting}"""
    user = UserFactory.create()
    kwargs = {theme_setting: 'value'}
    api.Api(user=user).create_theme('name', 'Title', **kwargs)
    assert mock_client.subreddit.create.called_once_with(
        'name', 'Title', subreddit_type=api.THEME_TYPE_PUBLIC, **kwargs
    )


def test_create_theme_invalid_setting(mock_client):
    """Test create_theme for invalid other_settings"""
    user = UserFactory.create()
    client = api.Api(user=user)
    with pytest.raises(ValueError):
        client.create_theme('name', 'Title', invalidarg='bad')
    assert mock_client.subreddit.create.call_count == 0


def test_create_theme_user_invalid_type(mock_client):
    """Test create_theme for logged-in user"""
    user = UserFactory.create()
    client = api.Api(user=user)
    with pytest.raises(ValueError):
        client.create_theme('name', 'Title', theme_type='notathemetype')
    assert mock_client.subreddit.create.call_count == 0


def test_create_theme_no_user(mock_client):
    """Test create_theme for anonymous user"""
    client = api.Api()
    with pytest.raises(Exception):
        client.create_theme('name', 'Title')
    assert mock_client.subreddit.create.call_count == 0


@pytest.mark.parametrize('theme_type', api.VALID_THEME_TYPES)
def test_update_theme_type(mock_client, theme_type):
    """Test create_theme for theme_type"""
    user = UserFactory.create()
    api.Api(user=user).update_theme('name', theme_type=theme_type)
    assert mock_client.subreddit.called_once_with('name')
    assert mock_client.subreddit.return_value.mode.update.called_once_with(subreddit_type=theme_type)


@pytest.mark.parametrize('theme_setting', api.THEME_SETTINGS + ('title',))
def test_update_theme_setting(mock_client, theme_setting):
    """Test update_theme for {theme_setting}"""
    user = UserFactory.create()
    kwargs = {theme_setting: 'value'}
    api.Api(user=user).update_theme('name', **kwargs)
    assert mock_client.subreddit.called_once_with('name')
    assert mock_client.subreddit.return_value.mode.update.called_once_with(**kwargs)


def test_create_post_text(mock_client):
    """Test create_post with text"""
    client = api.Api()
    client.create_post('theme', 'Title', text='Text')
    assert mock_client.subreddit.called_once_with('theme')
    assert mock_client.subreddit.return_value.submit.called_once_with('Title', selftext='Text', url=None)


def test_create_post_url(mock_client):
    """Test create_post with url"""
    client = api.Api()
    client.create_post('theme', 'Title', url='http://google.com')
    assert mock_client.subreddit.called_once_with('theme')
    assert mock_client.subreddit.return_value.submit.called_once_with('Title', selftext=None, url='http://google.com')


def test_create_post_url_and_text(mock_client):
    """Test create_post with url and text raises error"""
    client = api.Api()
    with pytest.raises(ValueError):
        client.create_post('theme', 'Title', url='http://google.com', text='Text')
    assert mock_client.subreddit.called_once_with('theme')
    assert mock_client.subreddit.return_value.submit.call_count == 0


def test_get_post(mock_client):
    """Test get_post"""
    client = api.Api()
    client.get_post('id')
    assert mock_client.submission.called_once_with(id='id')


def test_update_post_valid(mock_client):
    """Test update_post passes"""
    mock_client.submission.return_value.selftext = 'text'
    client = api.Api()
    client.update_post('id', 'Text')
    assert mock_client.submission.called_once_with(id='id')
    assert mock_client.submission.return_value.edit.called_once_with('text')


def test_update_post_invalid(mock_client):
    """Test update_post raises error if updating """
    mock_client.submission.return_value.selftext = ''
    client = api.Api()
    with pytest.raises(ValueError):
        client.update_post('id', 'Text')
    assert mock_client.submission.called_once_with(id='id')
    assert mock_client.submission.return_value.edit.call_count == 0
