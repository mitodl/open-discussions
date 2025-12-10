"""Utils tests"""
import pytest
from social_django.models import UserSocialAuth

from authentication.backends.micromasters import MicroMastersAuth
from authentication.exceptions import UserMissingSocialAuthException
from authentication.strategy import DjangoRestFrameworkStrategy
from authentication.utils import (
    jwt_get_username_from_payload_handler,
    load_drf_strategy,
)


def test_load_drf_strategy(mocker):
    """Test that load_drf_strategy returns a DjangoRestFrameworkStrategy instance"""
    assert isinstance(load_drf_strategy(mocker.Mock()), DjangoRestFrameworkStrategy)


@pytest.mark.parametrize("provider", [None, MicroMastersAuth.name])
def test_jwt_get_username_from_payload_handler(user, provider):
    """Test that the username is fetched from the JWT correctly"""
    social = UserSocialAuth.objects.create(
        user=user, provider=MicroMastersAuth.name, uid="abcdef"
    )
    if provider:
        payload = {"username": social.uid, "provider": provider}
    else:
        payload = {"username": user.username}

    assert jwt_get_username_from_payload_handler(payload) == user.username


@pytest.mark.django_db
def test_jwt_get_username_from_payload_handler_missing_social_auth():
    """Test that the username is fetched from the JWT correctly"""
    payload = {"username": "abcdef", "provider": "micromasters"}

    with pytest.raises(UserMissingSocialAuthException):
        jwt_get_username_from_payload_handler(payload)
