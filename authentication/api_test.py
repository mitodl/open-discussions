"""API tests"""
from typing import Literal
from django.contrib.auth import get_user_model
import pytest
from social_django.models import UserSocialAuth

from authentication import api
from authentication.backends.ol_open_id_connect import OlOpenIdConnectAuth
from profiles.models import Profile
from open_discussions.test_utils import any_instance_of

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "profile_data",
    [
        {"name": "My Name", "image": "http://localhost/image.jpg"},
        # {},
        # None,
    ],
)
def test_create_user(mocker, profile_data: dict[str, str]):
    """Tests that a user and associated objects are created"""
    auth_token_mock = mocker.patch("channels.api.get_or_create_auth_tokens")

    email = "email@localhost"
    username = "username"
    user = api.create_user(username, email, profile_data, {"first_name": "Bob"})

    assert isinstance(user, User)
    assert user.email == email
    assert user.username == username
    assert user.first_name == "Bob"

    auth_token_mock.assert_called_once()

    if "name" in profile_data:
        assert user.profile.name == profile_data["name"]
    else:
        assert user.profile.name is None


@pytest.mark.parametrize(
    "mock_method",
    ["profiles.api.ensure_profile"],
)
def test_create_user_errors(
    mocker,
    mock_method: Literal[
        "profiles.api.ensure_profile"
    ],
):
    """Test that we don't end up in a partial state if there are errors"""
    mocker.patch(mock_method, side_effect=Exception("error"))
    auth_token_mock = mocker.patch("channels.api.get_or_create_auth_tokens")

    with pytest.raises(Exception):
        api.create_user(
            "username",
            "email@localhost",
            {"name": "My Name", "image": "http://localhost/image.jpg"},
        )

    assert User.objects.all().count() == 0
    assert Profile.objects.count() == 0
    auth_token_mock.assert_not_called()


def test_create_user_token_error(mocker):
    """Test that an error creating a token fails the user creation"""
    auth_token_mock = mocker.patch(
        "channels.api.get_or_create_auth_tokens", side_effect=Exception("error")
    )

    with pytest.raises(Exception):
        assert (
            api.create_user(
                "username",
                "email@localhost",
                {"name": "My Name", "image": "http://localhost/image.jpg"},
            )
            is not None
        )

    assert User.objects.all().count() == 0
    assert Profile.objects.count() == 0
    assert NotificationSettings.objects.count() == 0
    auth_token_mock.assert_called_once()


def test_create_or_update_micromasters_social_auth(user):
    """Test that we create a MM social auth"""
    username = "abc123"
    email = "test@localhost"
    email2 = "test2@localhost"

    assert UserSocialAuth.objects.count() == 0
    assert (
        api.create_or_update_micromasters_social_auth(user, username, {"email": email})
        is not None
    )

    assert UserSocialAuth.objects.count() == 1

    social = UserSocialAuth.objects.first()
    assert social.user == user
    assert social.uid == username
    assert social.provider == "micromasters"
    assert social.extra_data == {
        "email": email,
        "username": username,
        "auth_time": any_instance_of(int),
    }

    # should be the same one as before, except email has updated
    assert (
        api.create_or_update_micromasters_social_auth(user, username, {"email": email2})
        == social
    )

    social.refresh_from_db()
    assert social.user == user
    assert social.uid == username
    assert social.extra_data == {
        "email": email2,
        "username": username,
        "auth_time": any_instance_of(int),
    }

    assert UserSocialAuth.objects.count() == 1


@pytest.fixture(name="keycloak_user")
def fixture_keycloak_user(user):
    """Fixture for a user that has an 'OlOpenIdConnectAuth' type UserSocialAuth record"""
    return UserSocialAuth.objects.create(
        provider=OlOpenIdConnectAuth.name, user=user, uid="123"
    )
