"""API tests"""
# pylint: disable=redefined-outer-name
import pytest

from open_discussions.factories import UserFactory
from themes import api

pytestmark = pytest.mark.django_db


@pytest.fixture()
def mock_get_client(mocker):
    """Mock reddit get_client"""
    return mocker.patch('themes.api._get_client', autospec=True)


@pytest.fixture()
def mock_client(mock_get_client):
    """Mock reddit client"""
    return mock_get_client.return_value


@pytest.mark.parametrize('create_user', [True, False])
def test_get_theme_user(mock_get_client, create_user):
    """Test get_themes for logged-in user"""
    user = UserFactory.create() if create_user else None
    api.Api(user=user).get_theme('test')
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.subreddit.assert_called_once_with('test')


def test_list_themes_user(mock_get_client):
    """Test list_themes for logged-in user"""
    user = UserFactory.create()
    api.Api(user=user).list_themes()
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.user.subreddits.assert_called_once_with()


def test_list_themes_no_user(mock_get_client):
    """Test list_themes for anonymous user"""
    api.Api().list_themes()
    mock_get_client.assert_called_once_with(user=None)
    mock_get_client.return_value.subreddits.default.assert_called_once_with()


@pytest.mark.parametrize('theme_type', api.VALID_THEME_TYPES)
def test_create_theme_user(mock_get_client, theme_type):
    """Test create_theme for logged-in user"""
    user = UserFactory.create()
    api.Api(user=user).create_theme('name', 'Title', theme_type=theme_type)
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.subreddit.create.assert_called_once_with(
        'name', title='Title', subreddit_type=theme_type
    )


@pytest.mark.parametrize('theme_setting', api.THEME_SETTINGS)
def test_create_theme_setting(mock_client, theme_setting):
    """Test create_theme for {theme_setting}"""
    user = UserFactory.create()
    kwargs = {theme_setting: 'value'}
    api.Api(user=user).create_theme('name', 'Title', **kwargs)
    mock_client.subreddit.create.assert_called_once_with(
        'name', title='Title', subreddit_type=api.THEME_TYPE_PUBLIC, **kwargs
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
    mock_client.subreddit.assert_called_once_with('name')
    mock_client.subreddit.return_value.mod.update.assert_called_once_with(subreddit_type=theme_type)


@pytest.mark.parametrize('theme_setting', api.THEME_SETTINGS + ('title',))
def test_update_theme_setting(mock_client, theme_setting):
    """Test update_theme for {theme_setting}"""
    user = UserFactory.create()
    kwargs = {theme_setting: 'value'}
    api.Api(user=user).update_theme('name', **kwargs)
    mock_client.subreddit.assert_called_once_with('name')
    mock_client.subreddit.return_value.mod.update.assert_called_once_with(**kwargs)


def test_create_post_text(mock_client):
    """Test create_post with text"""
    client = api.Api()
    client.create_post('theme', 'Title', text='Text')
    mock_client.subreddit.assert_called_once_with('theme')
    mock_client.subreddit.return_value.submit.assert_called_once_with('Title', selftext='Text', url=None)


def test_create_post_url(mock_client):
    """Test create_post with url"""
    client = api.Api()
    client.create_post('theme', 'Title', url='http://google.com')
    mock_client.subreddit.assert_called_once_with('theme')
    mock_client.subreddit.return_value.submit.assert_called_once_with(
        'Title', selftext=None, url='http://google.com'
    )


def test_create_post_url_and_text(mock_client):
    """Test create_post with url and text raises error"""
    client = api.Api()
    with pytest.raises(ValueError):
        client.create_post('theme', 'Title', url='http://google.com', text='Text')
    with pytest.raises(ValueError):
        client.create_post('theme', 'Title')
    assert mock_client.subreddit.call_count == 0


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
    mock_client.submission.assert_called_once_with(id='id')
    mock_client.submission.return_value.edit.assert_called_once_with('Text')


def test_update_post_invalid(mock_client):
    """Test update_post raises error if updating """
    mock_client.submission.return_value.selftext = ''
    client = api.Api()
    with pytest.raises(ValueError):
        client.update_post('id', 'Text')
    mock_client.submission.assert_called_once_with(id='id')
    assert mock_client.submission.return_value.edit.call_count == 0


def test_create_comment_on_post(mock_client):
    """Makes correct calls for comment on post"""
    client = api.Api()
    client.create_comment('text', post_id='id1')
    assert mock_client.comment.call_count == 0
    mock_client.submission.assert_called_once_with(id='id1')
    mock_client.submission.return_value.reply.assert_called_once_with('text')


def test_create_comment_on_comment(mock_client):
    """Makes correct calls for comment on comment"""
    client = api.Api()
    client.create_comment('text', comment_id='id2')
    assert mock_client.submission.call_count == 0
    mock_client.comment.assert_called_once_with('id2')
    mock_client.comment.return_value.reply.assert_called_once_with('text')


def test_create_comment_args_error(mock_client):
    """Errors if both args provided"""
    client = api.Api()
    with pytest.raises(ValueError):
        client.create_comment('text', post_id='id1', comment_id='id2')
    with pytest.raises(ValueError):
        client.create_comment('text')
    assert mock_client.submission.call_count == 0
    assert mock_client.comment.call_count == 0


def test_list_comments(mock_client):
    """Test list_comments"""
    client = api.Api()
    result = client.list_comments('id')
    assert mock_client.submission.called_once_with('id')
    assert result == mock_client.submission.return_value.comments


def test_get_comment(mock_client):
    """Test get_comment"""
    client = api.Api()
    client.get_comment('id')
    mock_client.comment.assert_called_once_with('id')


def test_delete_comment(mock_client):
    """Test delete_comment"""
    client = api.Api()
    client.delete_comment('id')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.delete.assert_called_once_with()


def test_update_comment(mock_client):
    """Test update_post passes"""
    client = api.Api()
    client.update_comment('id', 'Text')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.edit.assert_called_once_with('Text')


def test_more_comments(mock_client, mocker):
    """Test more_comments"""
    client = api.Api()
    children = ['t1_itmt', 't1_it56t']

    more_patch = mocker.patch('praw.models.reddit.more.MoreComments')
    result = client.more_comments('t1_gh_3i', 't3_iru_i2', 5, children=children)

    assert more_patch.called_once_with(client.reddit, {
        'id': 'gh_3i',
        'name': 't1_gh_3i',
        'parent_id': 't3_iru_i2',
        'children': children,
        'count': 5,
    })
    assert result == more_patch.return_value
    mock_client.submission.assert_called_once_with('iru_i2')
    assert result.submission == mock_client.submission.return_value
    result.comments.assert_called_once_with()
