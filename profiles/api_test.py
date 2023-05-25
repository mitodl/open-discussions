"""Profile API tests"""
import pytest

from channels.api import sync_channel_subscription_model, add_user_role
from channels.constants import ROLE_CONTRIBUTORS, ROLE_MODERATORS
from channels.factories.models import ChannelFactory
from channels.models import ChannelGroupRole
from open_discussions.factories import UserFactory
from profiles import api
from profiles.api import (
    get_channels,
    get_channel_join_dates,
    get_site_type_from_url,
    after_profile_created_or_updated,
)
from profiles.models import (
    Profile,
    FACEBOOK_DOMAIN,
    TWITTER_DOMAIN,
    LINKEDIN_DOMAIN,
    PERSONAL_SITE_TYPE,
)

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "profile_data", [{"image": "http://localhost:image.jpg"}, {}, None]
)
@pytest.mark.parametrize("no_profile", [True, False])
def test_ensure_profile(mocker, profile_data, no_profile):
    """Test that it creates a profile from the data"""
    mock_after_profile_created_or_updated = mocker.patch(
        "profiles.api.after_profile_created_or_updated", autospec=True
    )
    user = UserFactory.create(email="testuser@example.com", no_profile=no_profile)
    profile = api.ensure_profile(user, profile_data=profile_data)

    assert isinstance(profile, Profile)

    mock_after_profile_created_or_updated.assert_called_once_with(profile)

    if no_profile:
        if profile_data and "image" in profile_data:
            assert profile.image == profile_data["image"]
        else:
            assert not profile.image


def test_after_profile_created_or_updated(mocker, user):
    """The tasks should be called only after the transaction commits"""
    # you can't test transactions in tests because the test is wrapped in the transaction
    # so we mock it to mimic/test the behavior
    mock_transaction = mocker.patch("profiles.api.transaction")
    mock_search_tasks = mocker.patch("profiles.api.search_index_helpers")

    after_profile_created_or_updated(user.profile)

    mock_search_tasks.upsert_profile.assert_not_called()
    mock_search_tasks.update_author_posts_comments.assert_not_called()

    mock_transaction.on_commit.assert_called_once()

    # pretend the transaction committed
    on_commit = mock_transaction.on_commit.call_args[0][0]
    on_commit()

    mock_search_tasks.upsert_profile.assert_called_once_with(user.profile.id)
    mock_search_tasks.update_author_posts_comments.assert_called_once_with(
        user.profile.id
    )


def test_get_channels(user):
    """
    Test that get_channels returns the correct list of channel names for a user
    """
    channels = ChannelFactory.create_batch(4)
    sync_channel_subscription_model(channels[0], user)
    add_user_role(channels[1], ROLE_CONTRIBUTORS, user)
    add_user_role(channels[2], ROLE_MODERATORS, user)
    assert get_channels(user) == {channel.name for channel in channels[:3]}


def test_get_channel_join_dates(user):
    """
    Test out the get_channel_join_dates function
    """
    channels = ChannelFactory.create_batch(4)
    sync_channel_subscription_model(channels[0], user)
    sync_channel_subscription_model(channels[1], user)
    add_user_role(channels[2], "moderators", user)
    add_user_role(channels[3], "contributors", user)
    assert sorted(get_channel_join_dates(user)) == sorted(
        [
            (obj.channel.name, obj.created_on)
            for obj in list(user.channelsubscription_set.all())
            + list(ChannelGroupRole.objects.filter(group__in=user.groups.all()))
        ]
    )


@pytest.mark.parametrize(
    "url,exp_site_type",
    [
        ("http://facebook.co.uk", FACEBOOK_DOMAIN),
        ("HTTP://FACEBOOK.CO.UK", FACEBOOK_DOMAIN),
        ("http://twitter.com", TWITTER_DOMAIN),
        ("https://www.linkedin.com", LINKEDIN_DOMAIN),
        ("https://not.a.socialsite.ca", PERSONAL_SITE_TYPE),
        ("bad_url", PERSONAL_SITE_TYPE),
    ],
)
def test_get_site_type_from_url(url, exp_site_type):
    """Test that get_site_type_from_url returns the expected site type for a given URL value"""
    assert get_site_type_from_url(url) == exp_site_type
