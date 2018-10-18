"""Profile API tests"""
import pytest

from open_discussions.factories import UserFactory
from profiles import api
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
