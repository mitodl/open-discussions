"""Profile API tests"""
import pytest

from open_discussions.factories import UserFactory
from profiles import api
from profiles.models import (
    IMAGE_SMALL_MAX_DIMENSION,
    IMAGE_MEDIUM_MAX_DIMENSION,
    Profile,
)

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('profile_data', [
    {
        'image': 'http://localhost:image.jpg'
    },
    {},
    None
])
@pytest.mark.parametrize('no_profile', [True, False])
def test_ensure_profile(mocker, profile_data, no_profile):
    """Test that it creates a profile form the data"""
    mock_requests = mocker.patch('profiles.api.requests')
    mock_requests.get.return_value.status_code = 200
    user = UserFactory.create(email='testuser@example.com', no_profile=no_profile)
    profile = api.ensure_profile(user, profile_data=profile_data)

    assert isinstance(profile, Profile)

    if no_profile:
        if profile_data and 'image' in profile_data:
            assert profile.image == profile_data['image']
        else:
            base_img_url = 'https://www.gravatar.com/avatar/7ec7606c46a14a7ef514d1f1f9038823.jpg'
            assert profile.image == base_img_url
            assert profile.image_small == '{}?s={}'.format(base_img_url, IMAGE_SMALL_MAX_DIMENSION)
            assert profile.image_medium == '{}?s={}'.format(base_img_url, IMAGE_MEDIUM_MAX_DIMENSION)
    else:
        assert 'gravatar.com' not in profile.image
        assert 'gravatar.com' not in profile.image_small
        assert 'gravatar.com' not in profile.image_medium


@pytest.mark.parametrize('status_code', [404, 500])
def test_ensure_profile_error_codes(mocker, status_code):
    """Test that it doesn't set gravatar images if gravatar errors"""
    mock_requests = mocker.patch('profiles.api.requests')
    mock_requests.get.return_value.status_code = status_code
    user = UserFactory.create(no_profile=True)
    profile = api.ensure_profile(user)

    assert profile.image is None
    assert profile.image_small is None
    assert profile.image_medium is None
