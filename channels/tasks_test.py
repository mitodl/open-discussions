"""Tasks tests"""
import pytest

from channels import tasks
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


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
