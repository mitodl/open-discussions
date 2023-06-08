"""Tests for BaseJwtAuth"""
# pylint: disable=redefined-outer-name
import pytest
from rest_framework_jwt.settings import api_settings
from social_core.exceptions import AuthException

from authentication.backends.base_jwt import BaseJwtAuth


@pytest.fixture
def mock_strategy(mocker):
    """Mock strategy"""
    strategy = mocker.Mock()
    strategy.request.COOKIES = {}
    return strategy


@pytest.fixture
def auth(mock_strategy):
    """Auth instance"""
    return BaseJwtAuth(mock_strategy)


def test_auth_complete_no_auth_header(auth):
    """BaseJwtAuth raises an error if the header isn't present"""
    with pytest.raises(AuthException) as exc:
        auth.auth_complete()

    assert exc.value.backend == auth
    assert exc.value.args == ("Authorization header not present",)


def test_auth_complete_invalid_jwt_token(auth, mock_strategy):
    """BaseJwtAuth raises an error if the header is invalid"""
    mock_strategy.request.COOKIES[api_settings.JWT_AUTH_COOKIE] = "invalid"
    with pytest.raises(AuthException) as exc:
        auth.auth_complete()

    assert exc.value.backend == auth
    assert exc.value.args == ("Invalid JWT",)


def test_auth_complete(user, auth, mock_strategy):
    """BaseJwtAuth authenticates"""
    jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
    jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER
    jwt_payload = jwt_payload_handler(user)
    jwt_payload_resp = {**jwt_payload, "exp": int(jwt_payload["exp"].timestamp()), "user_profile_id": list(jwt_payload["user_profile_id"]), "jti": str(jwt_payload["jti"])}
    jwt_value = jwt_encode_handler(jwt_payload)
    mock_strategy.request.COOKIES[api_settings.JWT_AUTH_COOKIE] = jwt_value

    assert auth.auth_complete(1, arg2=2) == mock_strategy.authenticate.return_value
    mock_strategy.authenticate.assert_called_once_with(
        1, arg2=2, response=jwt_payload_resp, backend=auth
    )
