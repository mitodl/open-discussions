"""API tests"""
from django.contrib.auth import get_user_model
import pytest
from social_django.models import UserSocialAuth

from authentication import api
from notifications.models import NotificationSettings
from profiles.models import Profile
from open_discussions.test_utils import any_instance_of

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('profile_data', [
    {'name': 'My Name', 'image': 'http://localhost/image.jpg'},
    # {},
    # None,
])
def test_create_user(profile_data):
    """Tests that a user and associated objects are created"""
    email = 'email@localhost'
    username = 'username'
    user = api.create_user(username, email, profile_data, {
        'first_name': 'Bob',
    })

    assert isinstance(user, User)
    assert user.email == email
    assert user.username == username
    assert user.first_name == 'Bob'
    assert NotificationSettings.objects.count() == 2

    if 'name' in profile_data:
        assert user.profile.name == profile_data['name']
    else:
        assert user.profile.name is None


@pytest.mark.parametrize('mock_method', [
    'profiles.api.ensure_profile',
    'notifications.api.ensure_notification_settings',
])
def test_create_user_errors(mocker, mock_method):
    """Test that we don't end up in a partial state if there are errors"""
    mocker.patch(mock_method, side_effect=Exception('error'))
    auth_token_mock = mocker.patch('channels.api.get_or_create_auth_tokens')

    with pytest.raises(Exception):
        api.create_user('username', 'email@localhost', {
            'name': 'My Name',
            'image': 'http://localhost/image.jpg',
        })

    assert User.objects.all().count() == 0
    assert Profile.objects.count() == 0
    auth_token_mock.assert_not_called()


def test_create_user_token_error(mocker):
    """Test that an error creating a token does not fail the user creation"""
    auth_token_mock = mocker.patch('channels.api.get_or_create_auth_tokens', side_effect=Exception('error'))

    assert api.create_user('username', 'email@localhost', {
        'name': 'My Name',
        'image': 'http://localhost/image.jpg',
    }) is not None

    assert User.objects.all().count() == 1
    assert Profile.objects.count() == 1
    assert NotificationSettings.objects.count() == 2
    auth_token_mock.assert_called_once()


def test_create_micromasters_social_auth(user):
    """Test that we create a MM social auth"""

    assert UserSocialAuth.objects.count() == 0
    assert api.create_micromasters_social_auth(user) is not None

    assert UserSocialAuth.objects.count() == 1

    social = UserSocialAuth.objects.first()
    assert social.user == user
    assert social.uid == user.username
    assert social.provider == 'micromasters'
    assert social.extra_data == {
        'email': user.email,
        'username': user.username,
        'auth_time': any_instance_of(int),
    }
