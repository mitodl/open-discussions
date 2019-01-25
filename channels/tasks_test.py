"""Tasks tests"""
import pytest
from praw.models import Redditor
from prawcore.exceptions import ResponseException

from channels import tasks
from channels import api
from channels.constants import (
    CHANNEL_TYPE_PUBLIC,
    ROLE_MODERATORS,
    ROLE_CONTRIBUTORS,
    LINK_TYPE_ANY,
)
from channels.factories.models import ChannelFactory, PostFactory
from channels.models import ChannelSubscription, Channel
from open_discussions.factories import UserFactory
from search.exceptions import PopulateUserRolesException

pytestmark = pytest.mark.django_db

# pylint:disable=redefined-outer-name


@pytest.fixture
def channels_and_users():
    """Channels and users for testing"""
    return (
        [ChannelFactory.create(name=channel_name) for channel_name in ["a", "b", "c"]],
        UserFactory.create_batch(4),
    )


def test_evict_expired_access_tokens():
    """Test that the task evicts expired tokens"""
    from channels.factories.models import RedditAccessTokenFactory
    from channels.models import RedditAccessToken

    future = RedditAccessTokenFactory.create()
    expired = RedditAccessTokenFactory.create(expired=True)

    tasks.evict_expired_access_tokens.delay()

    assert RedditAccessToken.objects.count() == 1
    assert RedditAccessToken.objects.filter(id=future.id).exists()
    assert not RedditAccessToken.objects.filter(id=expired.id).exists()


def test_subscribe_all_users_to_default_channel(settings, mocker, admin_user):
    """Test that the main task batches out smaller tasks correctly"""
    mock_add_subscriber = mocker.patch("channels.api.Api.add_subscriber")
    mocker.patch("channels.api._get_client", autospec=True)
    settings.OPEN_DISCUSSIONS_DEFAULT_CHANNEL_BACKPOPULATE_BATCH_SIZE = 5
    settings.INDEXING_API_USERNAME = admin_user.username
    users = UserFactory.create_batch(17)

    tasks.subscribe_all_users_to_default_channel.delay(channel_name="nochannel")

    assert mock_add_subscriber.call_count == len(users)

    for user in users:
        mock_add_subscriber.asset_any_call(user.username, "nochannel")


def test_populate_subscriptions_and_roles(
    mocker, mocked_celery, settings, channels_and_users
):
    """
    populate_subscriptions_and_roles should call sub-tasks with correct ids
    """
    channels, users = channels_and_users
    users = sorted(users, key=lambda user: user.id)
    channels = sorted(channels, key=lambda channel: channel.id)
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 2
    mock_populate_user_subscriptions = mocker.patch(
        "channels.tasks.populate_user_subscriptions"
    )
    mock_populate_user_roles = mocker.patch("channels.tasks.populate_user_roles")

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.populate_subscriptions_and_roles.delay()

    assert mocked_celery.group.call_count == 1
    list(mocked_celery.group.call_args[0][0])
    mock_populate_user_subscriptions.si.assert_any_call([users[0].id, users[1].id])
    mock_populate_user_subscriptions.si.assert_any_call([users[2].id, users[3].id])
    mock_populate_user_roles.si.assert_any_call([channels[0].id, channels[1].id])
    mock_populate_user_roles.si.assert_any_call([channels[2].id])
    assert mocked_celery.replace.call_count == 1


@pytest.mark.parametrize("is_subscriber", [True, False])
def test_populate_user_subscriptions(mocker, is_subscriber, channels_and_users):
    """populate_user_subscriptions should create ChannelSubscription objects"""
    channels, users = channels_and_users
    client_mock = mocker.patch("channels.tasks.Api", autospec=True)
    client_mock.return_value.list_channels.return_value = [
        mocker.Mock(display_name=channel.name) for channel in channels if is_subscriber
    ]
    tasks.populate_user_subscriptions.delay([user.id for user in users])
    for user in users:
        for channel in channels:
            assert (
                ChannelSubscription.objects.filter(user=user, channel=channel).exists()
                is is_subscriber
            )


@pytest.mark.parametrize("is_moderator", [True, False])
@pytest.mark.parametrize("is_contributor", [True, False])
def test_populate_user_roles(
    mocker, is_contributor, is_moderator, channels_and_users, settings
):
    """populate_user_roles should create ChannelGroupRole objects"""
    channels, users = channels_and_users
    settings.INDEXING_API_USERNAME = users[0].username
    client_mock = mocker.patch("channels.api.Api", autospec=True)
    redditors = []
    for user in users:
        redditor = mocker.Mock(spec=Redditor)
        redditor.name = user.username
        redditors.append(redditor)

    client_mock.return_value.list_moderators.return_value = [
        redditor for redditor in redditors if is_moderator
    ]
    client_mock.return_value.list_contributors.return_value = [
        redditor for redditor in redditors if is_contributor
    ]
    tasks.populate_user_roles.delay([channel.id for channel in channels])
    for user in users:
        for channel in channels:
            assert (
                api.get_role_model(channel, ROLE_MODERATORS).group in user.groups.all()
            ) is is_moderator
            assert (
                api.get_role_model(channel, ROLE_CONTRIBUTORS).group
                in user.groups.all()
            ) is is_contributor


@pytest.mark.parametrize("is_error_moderator", [True, False])
def test_populate_user_roles_error(
    mocker, is_error_moderator, channels_and_users, settings
):
    """populate_user_roles should raise a PopulateUserRolesException if there is a ResponseException error"""
    channels, users = channels_and_users
    settings.INDEXING_API_USERNAME = users[0].username
    client_mock = mocker.patch("channels.api.Api", autospec=True)
    redditors = []
    for user in users:
        redditor = mocker.Mock(spec=Redditor)
        redditor.name = user.username
        redditors.append(redditor)

    client_mock.return_value.list_moderators.return_value = []
    client_mock.return_value.list_contributors.return_value = []

    if is_error_moderator:
        client_mock.return_value.list_moderators.side_effect = ResponseException(
            mocker.Mock()
        )
    else:
        client_mock.return_value.list_contributors.side_effect = ResponseException(
            mocker.Mock()
        )

    with pytest.raises(PopulateUserRolesException):
        tasks.populate_user_roles.delay([channel.id for channel in channels])


def test_populate_post_and_comment_fields(mocker, mocked_celery, settings):
    """
    populate_post_and_comment_fields should call sub-tasks with correct ids
    """
    posts = PostFactory.create_batch(4)
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 2
    mock_populate_post_and_comment_fields_batch = mocker.patch(
        "channels.tasks.populate_post_and_comment_fields_batch"
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.populate_post_and_comment_fields.delay()

    assert mocked_celery.group.call_count == 1
    list(mocked_celery.group.call_args[0][0])
    mock_populate_post_and_comment_fields_batch.si.assert_any_call(
        [posts[0].id, posts[1].id]
    )
    mock_populate_post_and_comment_fields_batch.si.assert_any_call(
        [posts[2].id, posts[3].id]
    )
    assert mocked_celery.replace.call_count == 1


def test_populate_post_and_comment_fields_batch(mocker, settings):
    """
    populate_post_and_comment_fields_batch should call backpopulate APIs for each post
    """
    settings.INDEXING_API_USERNAME = UserFactory.create().username
    posts = PostFactory.create_batch(10, unpopulated=True)
    mock_api = mocker.patch("channels.api.Api", autospec=True)
    mock_backpopulate_api = mocker.patch("channels.tasks.backpopulate_api")

    tasks.populate_post_and_comment_fields_batch.delay([post.id for post in posts])

    assert mock_api.return_value.get_submission.call_count == len(posts)
    assert mock_backpopulate_api.backpopulate_post.call_count == len(posts)
    assert mock_backpopulate_api.backpopulate_comments.call_count == len(posts)
    for post in posts:
        mock_api.return_value.get_submission.assert_any_call(post.post_id)
        mock_backpopulate_api.backpopulate_post.assert_any_call(
            post, mock_api.return_value.get_submission.return_value
        )
        mock_backpopulate_api.backpopulate_comments.assert_any_call(
            mock_api.return_value.get_submission.return_value
        )


def test_populate_channel_fields_batch(mocker, settings):
    """
    populate_channel_fields should set fields from reddit
    """
    settings.INDEXING_API_USERNAME = UserFactory.create().username
    channels = ChannelFactory.create_batch(2)
    mock_api = mocker.patch("channels.api.Api", autospec=True)
    mock_subreddit = mock_api.return_value.get_subreddit.return_value
    mock_subreddit.submission_type = LINK_TYPE_ANY
    mock_subreddit.title = "A channel title"
    mock_subreddit.subreddit_type = CHANNEL_TYPE_PUBLIC

    updated_channel = channels[0]
    updated_channel.allowed_post_types = 0
    updated_channel.title = None
    updated_channel.channel_type = None
    updated_channel.save()

    tasks.populate_channel_fields_batch.delay([channel.id for channel in channels])

    updated_channel.refresh_from_db()

    mock_api.return_value.get_subreddit.assert_called_once_with(updated_channel.name)

    assert int(updated_channel.allowed_post_types) == int(
        Channel.allowed_post_types.self | Channel.allowed_post_types.link
    )
    assert updated_channel.channel_type == CHANNEL_TYPE_PUBLIC
    assert updated_channel.title == "A channel title"
