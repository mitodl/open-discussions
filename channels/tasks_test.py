"""Tasks tests"""
import pytest
from praw.models import Redditor
from prawcore.exceptions import ResponseException

from channels import tasks
from channels.api import get_role_model
from channels.constants import ROLE_MODERATORS, ROLE_CONTRIBUTORS
from channels.factories import ChannelFactory
from channels.models import Channel, ChannelSubscription
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
    from channels.factories import RedditAccessTokenFactory
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
    client_mock = mocker.patch("channels.tasks.Api", autospec=True)
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
                get_role_model(channel, ROLE_MODERATORS).group in user.groups.all()
            ) is is_moderator
            assert (
                get_role_model(channel, ROLE_CONTRIBUTORS).group in user.groups.all()
            ) is is_contributor


@pytest.mark.parametrize("is_error_moderator", [True, False])
def test_populate_user_roles_error(
    mocker, is_error_moderator, channels_and_users, settings
):
    """populate_user_roles should raise a PopulateUserRolesException if there is a ResponseException error"""
    channels, users = channels_and_users
    settings.INDEXING_API_USERNAME = users[0].username
    client_mock = mocker.patch("channels.tasks.Api", autospec=True)
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
