"""API tests"""
# pylint: disable=redefined-outer-name
import pytest
from praw.models.reddit.redditor import Redditor
from rest_framework.exceptions import NotFound

from open_discussions.factories import UserFactory
from channels import (
    api,
    exceptions,
)

pytestmark = pytest.mark.django_db


@pytest.fixture()
def mock_get_client(mocker):
    """Mock reddit get_client"""
    return mocker.patch('channels.api._get_client', autospec=True)


@pytest.fixture()
def mock_client(mock_get_client):
    """Mock reddit client"""
    return mock_get_client.return_value


def test_get_channel_user(mock_get_client):
    """Test get_channels for logged-in user"""
    user = UserFactory.create()
    channel = api.Api(user=user).get_channel('test')
    assert channel == mock_get_client.return_value.subreddit.return_value
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.subreddit.assert_called_once_with('test')


def test_list_channels_user(mock_get_client):
    """Test list_channels for logged-in user"""
    user = UserFactory.create()
    channels = api.Api(user=user).list_channels()
    assert channels == mock_get_client.return_value.user.subreddits.return_value
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.user.subreddits.assert_called_once_with()


@pytest.mark.parametrize('channel_type', api.VALID_CHANNEL_TYPES)
def test_create_channel_user(mock_get_client, channel_type):
    """Test create_channel for logged-in user"""
    user = UserFactory.create()
    channel = api.Api(user=user).create_channel('name', 'Title', channel_type=channel_type)
    assert channel == mock_get_client.return_value.subreddit.create.return_value
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.subreddit.create.assert_called_once_with(
        'name', title='Title', subreddit_type=channel_type
    )


@pytest.mark.parametrize('channel_setting', api.CHANNEL_SETTINGS)
def test_create_channel_setting(mock_client, channel_setting):
    """Test create_channel for {channel_setting}"""
    user = UserFactory.create()
    kwargs = {channel_setting: 'value'}
    channel = api.Api(user=user).create_channel('name', 'Title', **kwargs)
    assert channel == mock_client.subreddit.create.return_value
    mock_client.subreddit.create.assert_called_once_with(
        'name', title='Title', subreddit_type=api.CHANNEL_TYPE_PUBLIC, **kwargs
    )


def test_create_channel_invalid_setting(mock_client):
    """Test create_channel for invalid other_settings"""
    user = UserFactory.create()
    client = api.Api(user=user)
    with pytest.raises(ValueError):
        client.create_channel('name', 'Title', invalidarg='bad')
    assert mock_client.subreddit.create.call_count == 0


def test_create_channel_user_invalid_type(mock_client):
    """Test create_channel for logged-in user"""
    user = UserFactory.create()
    client = api.Api(user=user)
    with pytest.raises(ValueError):
        client.create_channel('name', 'Title', channel_type='notachanneltype')
    assert mock_client.subreddit.create.call_count == 0


@pytest.mark.parametrize('channel_type', api.VALID_CHANNEL_TYPES)
def test_update_channel_type(mock_client, channel_type):
    """Test create_channel for channel_type"""
    user = UserFactory.create()
    channel = api.Api(user=user).update_channel('name', channel_type=channel_type)
    assert channel == mock_client.subreddit.return_value
    mock_client.subreddit.assert_called_with('name')
    assert mock_client.subreddit.call_count == 2
    mock_client.subreddit.return_value.mod.update.assert_called_once_with(subreddit_type=channel_type)


@pytest.mark.parametrize('channel_setting', api.CHANNEL_SETTINGS + ('title',))
def test_update_channel_setting(mock_client, channel_setting):
    """Test update_channel for {channel_setting}"""
    user = UserFactory.create()
    kwargs = {channel_setting: 'value'}
    channel = api.Api(user=user).update_channel('name', **kwargs)
    assert channel == mock_client.subreddit.return_value
    mock_client.subreddit.assert_called_with('name')
    assert mock_client.subreddit.call_count == 2
    mock_client.subreddit.return_value.mod.update.assert_called_once_with(**kwargs)


def test_create_post_text(mock_client):
    """Test create_post with text"""
    client = api.Api(UserFactory.create())
    post = client.create_post('channel', 'Title', text='Text')
    assert post == mock_client.subreddit.return_value.submit.return_value
    mock_client.subreddit.assert_called_once_with('channel')
    mock_client.subreddit.return_value.submit.assert_called_once_with('Title', selftext='Text', url=None)


def test_create_post_url(mock_client):
    """Test create_post with url"""
    client = api.Api(UserFactory.create())
    post = client.create_post('channel', 'Title', url='http://google.com')
    assert post == mock_client.subreddit.return_value.submit.return_value
    mock_client.subreddit.assert_called_once_with('channel')
    mock_client.subreddit.return_value.submit.assert_called_once_with(
        'Title', selftext=None, url='http://google.com'
    )


def test_create_post_url_and_text(mock_client):
    """Test create_post with url and text raises error"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.create_post('channel', 'Title', url='http://google.com', text='Text')
    with pytest.raises(ValueError):
        client.create_post('channel', 'Title')
    assert mock_client.subreddit.call_count == 0


def test_list_posts(mock_client):
    """list_posts should return a generator of posts"""
    client = api.Api(UserFactory.create())
    posts = client.list_posts('channel')
    assert posts == mock_client.subreddit.return_value.hot.return_value
    mock_client.subreddit.return_value.hot.assert_called_once_with()
    mock_client.subreddit.assert_called_once_with('channel')


def test_get_post(mock_client):
    """Test get_post"""
    client = api.Api(UserFactory.create())
    post = client.get_post('id')
    assert post == mock_client.submission.return_value
    mock_client.submission.assert_called_once_with(id='id')


def test_update_post_valid(mock_client):
    """Test update_post passes"""
    mock_client.submission.return_value.selftext = 'text'
    client = api.Api(UserFactory.create())
    post = client.update_post('id', 'Text')
    assert post == mock_client.submission.return_value.edit.return_value
    mock_client.submission.assert_called_once_with(id='id')
    mock_client.submission.return_value.edit.assert_called_once_with('Text')


def test_update_post_invalid(mock_client):
    """Test update_post raises error if updating a post which is not a self post"""
    mock_client.submission.return_value.is_self = ''
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.update_post('id', 'Text')
    mock_client.submission.assert_called_once_with(id='id')
    assert mock_client.submission.return_value.edit.call_count == 0


def test_create_comment_on_post(mock_client):
    """Makes correct calls for comment on post"""
    client = api.Api(UserFactory.create())
    comment = client.create_comment('text', post_id='id1')
    assert comment == mock_client.submission.return_value.reply.return_value
    assert mock_client.comment.call_count == 0
    mock_client.submission.assert_called_once_with(id='id1')
    mock_client.submission.return_value.reply.assert_called_once_with('text')


def test_create_comment_on_comment(mock_client):
    """Makes correct calls for comment on comment"""
    client = api.Api(UserFactory.create())
    comment = client.create_comment('text', comment_id='id2')
    assert comment == mock_client.comment.return_value.reply.return_value
    assert mock_client.submission.call_count == 0
    mock_client.comment.assert_called_once_with('id2')
    mock_client.comment.return_value.reply.assert_called_once_with('text')


def test_create_comment_args_error(mock_client):
    """Errors if both args provided"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.create_comment('text', post_id='id1', comment_id='id2')
    with pytest.raises(ValueError):
        client.create_comment('text')
    assert mock_client.submission.call_count == 0
    assert mock_client.comment.call_count == 0


def test_list_comments(mock_client):
    """Test list_comments"""
    client = api.Api(UserFactory.create())
    result = client.list_comments('id')
    mock_client.submission.assert_called_once_with(id='id')
    assert result == mock_client.submission.return_value.comments


def test_get_comment(mock_client):
    """Test get_comment"""
    client = api.Api(UserFactory.create())
    comment = client.get_comment('id')
    assert comment == mock_client.comment.return_value
    mock_client.comment.assert_called_once_with('id')


def test_delete_comment(mock_client):
    """Test delete_comment"""
    client = api.Api(UserFactory.create())
    client.delete_comment('id')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.delete.assert_called_once_with()


def test_update_comment(mock_client):
    """Test update_post passes"""
    client = api.Api(UserFactory.create())
    comment = client.update_comment('id', 'Text')
    assert comment == mock_client.comment.return_value.edit.return_value
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.edit.assert_called_once_with('Text')


def test_more_comments(mock_client, mocker):
    """Test more_comments"""
    client = api.Api(UserFactory.create())
    children = ['t1_itmt', 't1_it56t']

    more_patch = mocker.patch('praw.models.reddit.more.MoreComments')
    result = client.more_comments('t1_gh_3i', 't3_iru_i2', 5, children=children)

    more_patch.assert_called_once_with(client.reddit, {
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


def test_frontpage(mock_client):
    """Test front page"""
    client = api.Api(UserFactory.create())
    posts = client.front_page()
    assert posts == mock_client.front.hot.return_value
    mock_client.front.hot.assert_called_once_with()


def test_add_contributor(mock_client):
    """Test add contributor"""
    client_user = UserFactory.create()
    contributor = UserFactory.create()
    client = api.Api(client_user)
    redditor = client.add_contributor(contributor.username, 'foo_channel_name')
    mock_client.subreddit.return_value.contributor.add.assert_called_once_with(contributor)
    assert isinstance(redditor, Redditor)
    assert redditor.name == contributor.username


def test_add_remove_contributor_no_user(mock_client):
    """Test add and remove contributor in case the user does not exist"""
    client_user = UserFactory.create()
    client = api.Api(client_user)
    with pytest.raises(NotFound):
        client.add_contributor('fooooooo', 'foo_channel_name')
    assert mock_client.subreddit.return_value.contributor.add.call_count == 0

    with pytest.raises(NotFound):
        client.remove_contributor('fooooooo', 'foo_channel_name')
    assert mock_client.subreddit.return_value.contributor.remove.call_count == 0


def test_remove_contributor_moderator(mock_client):
    """Test remove contributor in case the user does is a moderator"""
    client_user = UserFactory.create()
    contributor = UserFactory.create()
    client = api.Api(client_user)
    mock_client.subreddit.return_value.moderator.return_value = [contributor.username]
    with pytest.raises(exceptions.RemoveUserException):
        client.remove_contributor(contributor.username, 'foo_channel_name')
    assert mock_client.subreddit.return_value.contributor.remove.call_count == 0


def test_remove_contributor(mock_client):
    """Test remove contributor"""
    client_user = UserFactory.create()
    contributor = UserFactory.create()
    client = api.Api(client_user)
    client.remove_contributor(contributor.username, 'foo_channel_name')
    mock_client.subreddit.return_value.contributor.remove.assert_called_once_with(contributor)


def test_list_contributors(mock_client):
    """Test list contributor"""
    client_user = UserFactory.create()
    client = api.Api(client_user)
    contributors = client.list_contributors('foo_channel_name')
    mock_client.subreddit.return_value.contributor.assert_called_once_with()
    assert mock_client.subreddit.return_value.contributor.return_value == contributors
