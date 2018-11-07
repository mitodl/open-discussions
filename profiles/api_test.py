"""Profile API tests"""
import pytest

from channels.api import sync_channel_subscription_model, sync_channel_role_model
from channels.constants import GROUP_CONTRIBUTORS, GROUP_MODERATORS
from channels.models import Channel
from open_discussions.factories import UserFactory
from profiles import api
from profiles.api import get_channels
from profiles.models import Profile

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
    channel_names = ["a", "b", "c", "d"]
    for channel_name in channel_names:
        Channel.objects.create(name=channel_name)
    sync_channel_subscription_model("a", user)
    sync_channel_role_model("b", user, GROUP_CONTRIBUTORS)
    sync_channel_role_model("c", user, GROUP_MODERATORS)
    assert get_channels(user) == {"a", "b", "c"}
