"""Profile API tests"""
import pytest

from channels.api import sync_channel_subscription_model, add_user_role
from channels.constants import ROLE_CONTRIBUTORS, ROLE_MODERATORS
from channels.factories.models import ChannelFactory
from channels.models import ChannelGroupRole
from open_discussions.factories import UserFactory
from profiles import api
from profiles.api import get_channels, get_channel_join_dates, get_site_type_from_url
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
def test_ensure_profile(profile_data, no_profile):
    """Test that it creates a profile from the data"""
    user = UserFactory.create(email="testuser@example.com", no_profile=no_profile)
    profile = api.ensure_profile(user, profile_data=profile_data)

    assert isinstance(profile, Profile)

    if no_profile:
        if profile_data and "image" in profile_data:
            assert profile.image == profile_data["image"]
        else:
            assert not profile.image


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
    assert get_channel_join_dates(user) == [
        (obj.channel.name, obj.created_on)
        for obj in list(user.channelsubscription_set.all())
        + list(ChannelGroupRole.objects.filter(group__in=user.groups.all()))
    ]


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
