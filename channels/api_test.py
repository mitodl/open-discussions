"""API tests"""
# pylint: disable=redefined-outer-name
from unittest.mock import Mock
from urllib.parse import urljoin

from django.contrib.auth.models import AnonymousUser
import pytest
from praw.models import Comment as RedditComment
from praw.models.comment_forest import CommentForest
from praw.models.reddit.redditor import Redditor
from prawcore.exceptions import ResponseException
from rest_framework.exceptions import NotFound

from channels import api
from channels.constants import (
    COMMENTS_SORT_BEST,
    VALID_CHANNEL_TYPES,
    POST_TYPE,
    COMMENT_TYPE,
    VoteActions,
)
from channels.models import (
    Channel,
    Comment,
    Post,
    RedditAccessToken,
    RedditRefreshToken,
    Subscription,
)
from channels.utils import (
    DEFAULT_LISTING_PARAMS,
    ListingParams,
)
from search import task_helpers
from open_discussions.factories import UserFactory
from open_discussions import features

pytestmark = pytest.mark.django_db


@pytest.fixture()
def mock_get_client(mocker):
    """Mock reddit get_client"""
    return mocker.patch('channels.api._get_client', autospec=True, return_value=Mock(
        subreddit=Mock(return_value=Mock(submit=Mock(return_value=Mock(id='abc')))),
        submission=Mock(return_value=Mock(reply=Mock(return_value=Mock(
            id='456',
            submission=Mock(id='123'),
            subreddit=Mock(display_name='subreddit'),
        )))),
        comment=Mock(return_value=Mock(reply=Mock(return_value=Mock(
            id='789',
            submission=Mock(id='687'),
            subreddit=Mock(display_name='other_subreddit'),
        )))),
    ))


@pytest.fixture()
def mock_client(mock_get_client):
    """Mock reddit client"""
    return mock_get_client.return_value


@pytest.mark.parametrize('vote_func', [api.Api.apply_post_vote, api.Api.apply_comment_vote])
@pytest.mark.parametrize('request_data,likes_value,expected_instance_vote_func', [
    ({'upvoted': True}, None, 'upvote'),
    ({'upvoted': True}, False, 'upvote'),
    ({'downvoted': True}, None, 'downvote'),
    ({'downvoted': True}, True, 'downvote'),
    ({'upvoted': False}, True, 'clear_vote'),
    ({'downvoted': False}, False, 'clear_vote'),
    ({'upvoted': True}, True, None),
    ({'upvoted': False}, False, None),
    ({'downvoted': True}, False, None),
    ({'downvoted': False}, True, None),
])
def test_apply_vote(mocker, vote_func, request_data, likes_value, expected_instance_vote_func):
    """
    Tests that the functions to apply an upvote/downvote behave appropriately given
    the voting request and the current state of upvotes/downvotes for the user.
    """
    mocker.patch('channels.api.update_indexed_score')
    mock_instance = mocker.Mock(likes=likes_value)
    vote_result = vote_func(mock_instance, request_data, allow_downvote=True)
    expected_vote_success = expected_instance_vote_func is not None
    assert vote_result is expected_vote_success
    if expected_vote_success:
        expected_vote_func = getattr(mock_instance, expected_instance_vote_func)
        assert expected_vote_func.call_count == 1


@pytest.mark.parametrize('vote_func,expected_allowed_downvote,expected_instance_type', [
    (api.Api.apply_post_vote, False, POST_TYPE),
    (api.Api.apply_comment_vote, True, COMMENT_TYPE),
])
def test_vote_indexing(mocker, vote_func, expected_allowed_downvote, expected_instance_type):
    """Test that an upvote/downvote calls a function to update the index"""
    patched_vote_indexer = mocker.patch('channels.api.update_indexed_score')
    # Test upvote
    mock_reddit_obj = Mock()
    mock_reddit_obj.likes = False
    vote_func(mock_reddit_obj, {'upvoted': True})
    patched_vote_indexer.assert_called_once_with(
        mock_reddit_obj,
        expected_instance_type,
        VoteActions.UPVOTE
    )
    # Test downvote (which may not be allowed)
    patched_vote_indexer.reset_mock()
    mock_reddit_obj.likes = True
    vote_func(mock_reddit_obj, {'downvoted': True})
    assert patched_vote_indexer.called is expected_allowed_downvote
    if patched_vote_indexer.called:
        patched_vote_indexer.assert_called_once_with(
            mock_reddit_obj,
            expected_instance_type,
            VoteActions.DOWNVOTE
        )
    # Test unchanged vote
    patched_vote_indexer.reset_mock()
    mock_reddit_obj.likes = True
    vote_func(mock_reddit_obj, {'upvoted': True})
    assert not patched_vote_indexer.called


def test_get_session(settings):
    """Test that _get_session uses the access token from settings"""
    settings.OPEN_DISCUSSIONS_REDDIT_ACCESS_TOKEN = 'ACCESS_TOKEN'
    # pylint: disable=protected-access
    assert api._get_session().headers[api.ACCESS_TOKEN_HEADER_NAME] == 'ACCESS_TOKEN'


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
    mock_get_client.return_value.user.subreddits.assert_called_once_with(limit=None)


@pytest.mark.parametrize('channel_type', VALID_CHANNEL_TYPES)
def test_create_channel_user(mock_get_client, channel_type):
    """Test create_channel for logged-in user"""
    assert Channel.objects.count() == 0
    user = UserFactory.create()
    channel = api.Api(user=user).create_channel('name', 'Title', channel_type=channel_type)
    assert channel == mock_get_client.return_value.subreddit.create.return_value
    mock_get_client.assert_called_once_with(user=user)
    mock_get_client.return_value.subreddit.create.assert_called_once_with(
        'name', title='Title', subreddit_type=channel_type
    )
    assert Channel.objects.count() == 1
    channel_obj = Channel.objects.first()
    assert channel_obj.name == 'name'


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


@pytest.mark.parametrize('channel_type', VALID_CHANNEL_TYPES)
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


def test_create_post_text(mock_client, indexing_decorator):
    """Test create_post with text"""
    assert Post.objects.count() == 0
    client = api.Api(UserFactory.create())
    post = client.create_post('channel', 'Title', text='Text')
    assert post == mock_client.subreddit.return_value.submit.return_value
    mock_client.subreddit.assert_called_once_with('channel')
    mock_client.subreddit.return_value.submit.assert_called_once_with('Title', selftext='Text', url=None)
    # This API function should be wrapped with the indexing decorator
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.index_new_post
    assert Post.objects.count() == 1
    post_obj = Post.objects.first()
    assert post_obj.channel.name == 'channel'
    assert post_obj.post_id == post.id


def test_create_post_url(mock_client, indexing_decorator):
    """Test create_post with url"""
    client = api.Api(UserFactory.create())
    post = client.create_post('channel', 'Title', url='http://google.com')
    assert post == mock_client.subreddit.return_value.submit.return_value
    mock_client.subreddit.assert_called_once_with('channel')
    mock_client.subreddit.return_value.submit.assert_called_once_with(
        'Title', selftext=None, url='http://google.com'
    )
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.index_new_post


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
    posts = client.list_posts('channel', DEFAULT_LISTING_PARAMS)
    assert posts == mock_client.subreddit.return_value.hot.return_value
    mock_client.subreddit.return_value.hot.assert_called_once_with(limit=25, params={'count': 0})
    mock_client.subreddit.assert_called_once_with('channel')


def test_list_posts_invalid_sort(mock_client):
    """list_posts should raise an error is sort is invalid"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.list_posts('channel', ListingParams(None, None, 0, 'bad'))
        mock_client.subreddit.assert_called_once_with('channel')


def test_get_post(mock_client):
    """Test get_post"""
    client = api.Api(UserFactory.create())
    post = client.get_post('id')
    assert post == mock_client.submission.return_value
    mock_client.submission.assert_called_once_with(id='id')


def test_update_post_valid(mock_client, indexing_decorator):
    """Test update_post passes"""
    mock_client.submission.return_value.selftext = 'text'
    client = api.Api(UserFactory.create())
    post = client.update_post('id', 'Text')
    assert post == mock_client.submission.return_value.edit.return_value
    mock_client.submission.assert_called_once_with(id='id')
    mock_client.submission.return_value.edit.assert_called_once_with('Text')
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.update_post_text


def test_update_post_invalid(mock_client):
    """Test update_post raises error if updating a post which is not a self post"""
    mock_client.submission.return_value.is_self = ''
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.update_post('id', 'Text')
    mock_client.submission.assert_called_once_with(id='id')
    assert mock_client.submission.return_value.edit.call_count == 0


def test_approve_post(mock_client, indexing_decorator):
    """Test approve_post passes"""
    mock_client.submission.return_value.selftext = 'text'
    client = api.Api(UserFactory.create())
    client.approve_post('id')
    mock_client.submission.assert_called_once_with(id='id')
    mock_client.submission.return_value.mod.approve.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.update_post_removal_status


def test_remove_post(mock_client, indexing_decorator):
    """Test remove_post passes"""
    mock_client.submission.return_value.selftext = 'text'
    client = api.Api(UserFactory.create())
    client.remove_post('id')
    mock_client.submission.assert_called_once_with(id='id')
    mock_client.submission.return_value.mod.remove.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.update_post_removal_status


def test_create_comment_on_post(mock_client, indexing_decorator):
    """Makes correct calls for comment on post"""
    assert Comment.objects.count() == 0
    client = api.Api(UserFactory.create())
    comment = client.create_comment('text', post_id='id1')
    assert comment == mock_client.submission.return_value.reply.return_value
    assert mock_client.comment.call_count == 0
    mock_client.submission.assert_called_once_with(id='id1')
    mock_client.submission.return_value.reply.assert_called_once_with('text')
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.index_new_comment
    assert Comment.objects.count() == 1
    comment_obj = Comment.objects.first()
    assert comment_obj.post.channel.name == comment.subreddit.display_name
    assert comment_obj.post.post_id == '123'
    assert comment_obj.comment_id == comment.id
    assert comment_obj.parent_id is None


def test_create_comment_on_comment(mock_client, indexing_decorator):
    """Makes correct calls for comment on comment"""
    assert Comment.objects.count() == 0
    client = api.Api(UserFactory.create())
    comment = client.create_comment('text', comment_id='id2')
    assert comment == mock_client.comment.return_value.reply.return_value
    assert mock_client.submission.call_count == 0
    mock_client.comment.assert_called_once_with('id2')
    mock_client.comment.return_value.reply.assert_called_once_with('text')
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.index_new_comment
    assert Comment.objects.count() == 1
    comment_obj = Comment.objects.first()
    assert comment_obj.post.channel.name == comment.subreddit.display_name
    assert comment_obj.post.post_id == '687'
    assert comment_obj.comment_id == comment.id
    assert comment_obj.parent_id == 'id2'


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
    result = client.list_comments('id', COMMENTS_SORT_BEST)
    mock_client.submission.assert_called_once_with(id='id')
    assert mock_client.submission.return_value.comment_sort == COMMENTS_SORT_BEST
    assert result == mock_client.submission.return_value.comments


def test_list_comments_invalid_sort(mock_client):
    """Test list_comments with invalid sort raises error"""
    client = api.Api(UserFactory.create())
    with pytest.raises(ValueError):
        client.list_comments('id', 'invalid')
    assert mock_client.submission.call_count == 0


def test_get_comment(mock_client):
    """Test get_comment"""
    client = api.Api(UserFactory.create())
    comment = client.get_comment('id')
    assert comment == mock_client.comment.return_value
    mock_client.comment.assert_called_once_with('id')


def test_delete_comment(mock_client, indexing_decorator):
    """Test delete_comment"""
    client = api.Api(UserFactory.create())
    client.delete_comment('id')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.delete.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.set_comment_to_deleted


def test_update_comment(mock_client, indexing_decorator):
    """Test update_post passes"""
    client = api.Api(UserFactory.create())
    comment = client.update_comment('id', 'Text')
    assert comment == mock_client.comment.return_value.edit.return_value
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.edit.assert_called_once_with('Text')
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.update_comment_text


def test_approve_comment(mock_client, indexing_decorator):
    """Test approve_post passes"""
    mock_client.submission.return_value.selftext = 'text'
    client = api.Api(UserFactory.create())
    client.approve_comment('id')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.mod.approve.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.update_comment_removal_status


def test_remove_comment(mock_client, indexing_decorator):
    """Test remove_comment passes"""
    mock_client.submission.return_value.selftext = 'text'
    client = api.Api(UserFactory.create())
    client.remove_comment('id')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.mod.remove.assert_called_once_with()
    # This API function should be wrapped with the indexing decorator and pass in a specific indexer function
    assert indexing_decorator.mock_indexer_func.call_count == 1
    assert indexing_decorator.mock_indexer_func.original == task_helpers.update_comment_removal_status


def test_init_more_comments(mock_client, mocker):
    """Test init_more_comments"""
    client = api.Api(UserFactory.create())
    children = ['t1_itmt', 't1_it56t']

    more_patch = mocker.patch('praw.models.reddit.more.MoreComments')
    result = client.init_more_comments('parent_3i', 'post_i2', children, COMMENTS_SORT_BEST)

    more_patch.assert_called_once_with(client.reddit, {
        'parent_id': 't1_parent_3i',
        'children': children,
        'count': len(children),
    })
    assert result == more_patch.return_value
    mock_client.submission.assert_called_once_with('post_i2')
    assert result.submission == mock_client.submission.return_value
    assert result.submission.comment_sort == COMMENTS_SORT_BEST
    result.comments.assert_called_once_with()


def test_init_more_comments_no_parents(mock_client, mocker):
    """If no parent id is present the post id should be used"""
    client = api.Api(UserFactory.create())
    children = ['t1_itmt', 't1_it56t']

    more_patch = mocker.patch('praw.models.reddit.more.MoreComments')
    result = client.init_more_comments(None, 'post_i2', children, COMMENTS_SORT_BEST)

    more_patch.assert_called_once_with(client.reddit, {
        'parent_id': 't3_post_i2',
        'children': children,
        'count': len(children),
    })
    assert result == more_patch.return_value
    mock_client.submission.assert_called_once_with('post_i2')
    assert result.submission == mock_client.submission.return_value
    result.comments.assert_called_once_with()


def test_init_more_comments_invalid_sort(mock_client, mocker):  # pylint: disable=unused-argument
    """If no parent id is present the post id should be used"""
    client = api.Api(UserFactory.create())
    children = ['t1_itmt', 't1_it56t']

    more_patch = mocker.patch('praw.models.reddit.more.MoreComments')
    with pytest.raises(ValueError):
        client.init_more_comments(None, 'post_i2', children, 'invalid_sort')

    assert more_patch.call_count == 0


def test_more_comments(mocker):  # pylint: disable=unused-argument
    """Test more_comments without any extra comments"""
    client = api.Api(UserFactory.create())
    children = ['t1_itmt', 't1_it56t']

    init_more_mock = mocker.patch('channels.api.Api.init_more_comments')
    post_id = 'post_i2'
    mocker.patch.object(RedditComment, 'replies', [])

    def _make_comment(comment_id):
        """Helper to make a comment with a valid list of replies"""
        return RedditComment(client.reddit, id=comment_id)

    comments = [_make_comment(comment_id) for comment_id in children]
    init_more_mock.return_value.comments.return_value = CommentForest(post_id, comments=comments)

    result = client.more_comments('parent_3i', post_id, children, COMMENTS_SORT_BEST)
    init_more_mock.assert_called_once_with(
        parent_id='parent_3i',
        post_id='post_i2',
        children=children,
        sort=COMMENTS_SORT_BEST,
    )
    assert result == comments


def test_more_comments_with_more_comments(mocker):  # pylint: disable=unused-argument
    """Test more_comments with an extra MoreComments"""
    client = api.Api(UserFactory.create())
    children = ['1', '2', '3']
    extra_children = ['4', '5', '6']

    init_more_mock = mocker.patch('channels.api.Api.init_more_comments')
    post_id = 'post_i2'
    mocker.patch.object(RedditComment, 'replies', [])

    def _make_comment(comment_id):
        """Helper to make a comment with a valid list of replies"""
        return RedditComment(client.reddit, id=comment_id)

    first_comments = [_make_comment(child) for child in children]
    side_effects = [
        Mock(
            comments=Mock(
                return_value=CommentForest(post_id, comments=first_comments)
            )
        ),
        Mock()  # only used for identity comparison
    ]
    init_more_mock.side_effect = side_effects

    result = client.more_comments('parent_3i', post_id, children + extra_children, COMMENTS_SORT_BEST)
    assert init_more_mock.call_count == 2
    init_more_mock.assert_any_call(
        parent_id='parent_3i',
        post_id='post_i2',
        children=children + extra_children,
        sort=COMMENTS_SORT_BEST,
    )
    init_more_mock.assert_any_call(
        parent_id='parent_3i',
        post_id='post_i2',
        children=extra_children,
        sort=COMMENTS_SORT_BEST,
    )

    assert result[:-1] == first_comments
    more_comments = result[-1]
    assert side_effects[1] == more_comments


def test_frontpage(mock_client):
    """Test front page"""
    client = api.Api(UserFactory.create())
    posts = client.front_page(DEFAULT_LISTING_PARAMS)
    assert posts == mock_client.front.hot.return_value
    mock_client.front.hot.assert_called_once_with(limit=25, params={'count': 0})


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


def test_add_moderator(mock_client):
    """Test add moderator"""
    client = api.Api(UserFactory.create())
    moderator = UserFactory.create()
    redditor = client.add_moderator(moderator.username, 'channel_test_name')
    mock_client.subreddit.return_value.moderator.add.assert_called_once_with(moderator)
    assert redditor.name == moderator.username


def test_add_moderator_no_user(mock_client):
    """Test add moderator where user does not exist"""
    client = api.Api(UserFactory.create())
    with pytest.raises(NotFound):
        client.add_moderator('foo_username', 'foo_channel_name')
    assert mock_client.subreddit.return_value.moderator.add.call_count == 0

    with pytest.raises(NotFound):
        client.remove_moderator('foo_username', 'foo_channel_name')
    assert mock_client.subreddit.return_value.moderator.remove.call_count == 0


def test_remove_moderator(mock_client):
    """Test remove moderator"""
    client = api.Api(UserFactory.create())
    moderator = UserFactory.create()
    client.remove_moderator(moderator.username, 'channel_test_name')
    mock_client.subreddit.return_value.moderator.remove.assert_called_once_with(moderator)


def test_list_moderator(mock_client):
    """Test list moderator"""
    client = api.Api(UserFactory.create())
    moderators = client.list_moderators('channel_test_name')
    mock_client.subreddit.return_value.moderator.assert_called_once_with(redditor=None)
    assert mock_client.subreddit.return_value.moderator.return_value == moderators


def test_list_moderator_filter(mock_client):
    """Test list moderator"""
    client = api.Api(UserFactory.create())
    moderators = client.list_moderators('channel_test_name', moderator_name='username')
    mock_client.subreddit.return_value.moderator.assert_called_once_with(redditor='username')
    assert mock_client.subreddit.return_value.moderator.return_value == moderators


@pytest.mark.parametrize('is_moderator', [True, False])
def test_is_moderator(mock_client, is_moderator):
    """Test list moderator"""
    client = api.Api(UserFactory.create())
    # the actual return value here will be different against a reddit backend
    # but truthiness of the return iterable is all that matters
    mock_client.subreddit.return_value.moderator.return_value = ['username'] if is_moderator else []
    assert client.is_moderator('channel_test_name', 'username') is is_moderator
    mock_client.subreddit.return_value.moderator.assert_called_once_with(redditor='username')


@pytest.mark.parametrize('verify_ssl', [True, False])
def test_api_constructor(mocker, settings, verify_ssl):
    """
    Api() should have a client which uses certain settings to configure its request session
    """
    client_user = UserFactory.create()
    session_stub = mocker.patch('channels.api.requests.Session', autospec=True)
    refresh_token = 'token'
    session_stub.return_value.get.return_value.json.return_value = {
        'refresh_token': refresh_token,
        'access_token': 'access_token',
        'expires_in': 123,
    }
    session_stub.return_value.headers = {}

    settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = 'client_id'
    settings.OPEN_DISCUSSIONS_REDDIT_SECRET = 'secret'
    settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = verify_ssl
    settings.OPEN_DISCUSSIONS_REDDIT_URL = 'http://fake_url'
    settings.VERSION = '1.2.3'

    client = api.Api(client_user)
    config = client.reddit.config
    assert config.short_url == settings.OPEN_DISCUSSIONS_REDDIT_URL
    assert config.reddit_url == settings.OPEN_DISCUSSIONS_REDDIT_URL
    assert config.oauth_url == settings.OPEN_DISCUSSIONS_REDDIT_URL
    assert config.user_agent == "MIT-Open: {}".format(settings.VERSION)
    assert config.client_id == settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID
    assert config.client_secret == settings.OPEN_DISCUSSIONS_REDDIT_SECRET
    assert config.refresh_token == refresh_token


def test_api_constructor_error(mocker):
    """
    If a non-401 response is received during Api() initialization, we should not delete the refresh
    and access tokens.
    """
    client_user = UserFactory.create()

    error = ResponseException(response=Mock(status_code=400))
    mocker.patch('channels.api._get_client', autospec=True, side_effect=error)

    RedditAccessToken.objects.create(user=client_user, token_value='token')
    RedditRefreshToken.objects.create(user=client_user, token_value='token')

    with pytest.raises(ResponseException):
        api.Api(client_user)

    # No attempt to clear tokens was made
    assert RedditAccessToken.objects.count() == 1
    assert RedditRefreshToken.objects.count() == 1


def test_api_constructor_anonymous_error(mocker, settings):
    """
    If a 401 error is raised and the user is anonymous we should just raise the exception instead of trying again
    """
    settings.FEATURES[features.ANONYMOUS_ACCESS] = True

    error = ResponseException(response=Mock(status_code=401))
    get_client_mock = mocker.patch('channels.api._get_client', autospec=True, side_effect=error)

    with pytest.raises(ResponseException):
        api.Api(None)

    assert get_client_mock.call_count == 1


def test_api_constructor_401_once(mocker):
    """
    If a 401 response is received during Api() initialization, we should delete the refresh
    and access tokens and try once more. The second time should succeed
    """
    client_user = UserFactory.create()

    mocked_client = Mock()
    effect = [
        ResponseException(response=Mock(status_code=401)),
        mocked_client,
    ]
    mocker.patch('channels.api._get_client', autospec=True, side_effect=effect)

    RedditAccessToken.objects.create(user=client_user, token_value='token')
    RedditRefreshToken.objects.create(user=client_user, token_value='token')

    assert api.Api(client_user).reddit == mocked_client

    assert RedditAccessToken.objects.count() == 0
    assert RedditRefreshToken.objects.count() == 0


def test_api_constructor_401_twice(mocker):
    """
    If a 401 response is received during Api() initialization, we should delete the refresh
    and access tokens and try once more. The second time should raise the error
    """
    client_user = UserFactory.create()

    effect = [
        ResponseException(response=Mock(status_code=401)),
        ResponseException(response=Mock(status_code=401)),
    ]
    mocker.patch('channels.api._get_client', autospec=True, side_effect=effect)

    RedditAccessToken.objects.create(user=client_user, token_value='token')
    RedditRefreshToken.objects.create(user=client_user, token_value='token')

    with pytest.raises(ResponseException):
        api.Api(client_user)

    assert RedditAccessToken.objects.count() == 0
    assert RedditRefreshToken.objects.count() == 0


@pytest.mark.parametrize("is_none", [True, False])
def test_api_constructor_none(settings, is_none):
    """Api(None) should initialize for an anonymous user"""
    settings.FEATURES[features.ANONYMOUS_ACCESS] = True
    client = api.Api(None if is_none else AnonymousUser())
    assert bool(client.user.is_anonymous) is True


def test_api_constructor_anonymous_forbidden(settings):
    """Anonymous access should cause an exception to be raised if the feature flag is not set"""
    settings.FEATURES[features.ANONYMOUS_ACCESS] = False
    with pytest.raises(Exception) as ex:
        api.Api(None)

    assert ex.value.args[0] == 'Anonymous access is not allowed'


def test_get_or_create_auth_tokens(mocker, settings, user):
    """
    get_or_create_auth_tokens will contact our plugin's API to get a refresh token for a user, or to create one
    """
    settings.OPEN_DISCUSSIONS_REDDIT_URL = 'http://fake'
    refresh_token_url = urljoin(settings.OPEN_DISCUSSIONS_REDDIT_URL, '/api/v1/generate_refresh_token')
    get_session_stub = mocker.patch('channels.api._get_session', autospec=True)
    refresh_token_value = 'refresh_token'
    access_token_value = 'access_token'
    get_session_stub.return_value.get.return_value.json.return_value = {
        'refresh_token': refresh_token_value,
        'access_token': access_token_value,
        'expires_in': 123,
    }
    assert RedditAccessToken.objects.filter(user=user).count() == 0
    assert RedditRefreshToken.objects.filter(user=user).count() == 0
    refresh_token, access_token = api.get_or_create_auth_tokens(user)
    assert refresh_token.token_value == refresh_token_value
    assert access_token.token_value == access_token_value
    get_session_stub.return_value.get.assert_called_once_with(refresh_token_url, params={'username': user.username})
    get_session_stub.return_value.get.return_value.json.assert_called_once_with()
    assert RedditAccessToken.objects.filter(user=user).count() == 1
    assert RedditRefreshToken.objects.filter(user=user).count() == 1


def test_add_subscriber(mock_client):
    """Test add subscriber"""
    client = api.Api(UserFactory.create())
    subscriber = UserFactory.create()
    redditor = client.add_subscriber(subscriber.username, 'channel_test_name')
    mock_client.subreddit.return_value.subscribe.assert_called_once_with()
    assert redditor.name == subscriber.username


def test_add_remove_subscriber_no_user(mock_client):
    """Test add and remove subscriber in case the user does not exist"""
    client_user = UserFactory.create()
    client = api.Api(client_user)
    with pytest.raises(NotFound):
        client.add_subscriber('fooooooo', 'foo_channel_name')
    assert mock_client.subreddit.return_value.subscribe.call_count == 0

    with pytest.raises(NotFound):
        client.remove_contributor('fooooooo', 'foo_channel_name')
    assert mock_client.subreddit.return_value.unsubscribe.call_count == 0


def test_remove_subscriber(mock_client):
    """Test remove subscriber"""
    client = api.Api(UserFactory.create(username='mitodl'))
    subscriber = UserFactory.create(username='01BTN7HY2SGT9677JXGNDDW859')
    client.remove_subscriber(subscriber.username, 'testchannel5')
    mock_client.subreddit.return_value.unsubscribe.assert_called_once_with()


def test_is_subscriber(mock_client):
    """Test is subscriber"""
    client = api.Api(UserFactory.create(username='mitodl'))
    subscriber = UserFactory.create()
    mock_client.user.subreddits.return_value = [Mock(display_name='sub1'), Mock(display_name='sub2')]
    assert client.is_subscriber(subscriber.username, 'channel_test_name') is False
    assert client.is_subscriber(subscriber.username, 'sub2') is True
    assert mock_client.user.subreddits.call_count == 2


def test_report_comment(mock_client):
    """Test report_comment"""
    client = api.Api(UserFactory.create())
    client.report_comment('id', 'reason')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.report.assert_called_once_with('reason')


def test_report_post(mock_client):
    """Test report_post"""
    client = api.Api(UserFactory.create())
    client.report_post('id', 'reason')
    mock_client.submission.assert_called_once_with(id='id')
    mock_client.submission.return_value.report.assert_called_once_with('reason')


def test_list_reports(mock_client):
    """Test list_reports"""
    client = api.Api(UserFactory.create())
    assert client.list_reports('channel') == mock_client.subreddit.return_value.mod.reports.return_value
    mock_client.subreddit.assert_called_once_with('channel')
    mock_client.subreddit.return_value.mod.reports.assert_called_once_with()


def test_ignore_comment_reports(mock_client):
    """Test ignore_comment_reports"""
    client = api.Api(UserFactory.create())
    client.ignore_comment_reports('id')
    mock_client.comment.assert_called_once_with('id')
    mock_client.comment.return_value.mod.ignore_reports.assert_called_once_with()


def test_ignore_post_reports(mock_client):
    """Test ignore_post_reports"""
    client = api.Api(UserFactory.create())
    client.ignore_post_reports('id')
    mock_client.submission.assert_called_once_with(id='id')
    mock_client.submission.return_value.mod.ignore_reports.assert_called_once_with()


def test_add_post_subscription(mock_client, user):  # pylint: disable=unused-argument
    """Test add_post_subscription"""
    client = api.Api(user)
    assert not Subscription.objects.filter(user=user, post_id='abc').exists()
    client.add_post_subscription('abc')
    assert Subscription.objects.filter(user=user, post_id='abc').exists()


def test_remove_post_subscription(mock_client, user):  # pylint: disable=unused-argument
    """Test remove_post_subscription"""
    client = api.Api(user)
    client.add_post_subscription('abc')
    assert Subscription.objects.filter(user=user, post_id='abc').exists()
    client.remove_post_subscription('abc')
    assert not Subscription.objects.filter(user=user, post_id='abc').exists()


def test_add_comment_subscription(mock_client, user):  # pylint: disable=unused-argument
    """Test add_comment_subscription"""
    client = api.Api(user)
    assert not Subscription.objects.filter(user=user, post_id='abc', comment_id='def').exists()
    client.add_comment_subscription('abc', 'def')
    assert Subscription.objects.filter(user=user, post_id='abc', comment_id='def').exists()


def test_remove_comment_subscription(mock_client, user):  # pylint: disable=unused-argument
    """Test remove_comment_subscription"""
    client = api.Api(user)
    client.add_comment_subscription('abc', 'def')
    assert Subscription.objects.filter(user=user, post_id='abc', comment_id='def').exists()
    client.remove_comment_subscription('abc', 'def')
    assert not Subscription.objects.filter(user=user, post_id='abc', comment_id='def').exists()
