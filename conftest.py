"""Configuration for pytest fixtures"""
# pylint: disable=unused-argument, redefined-outer-name
import pytest
from rest_framework_jwt.settings import api_settings

from open_discussions.factories import UserFactory


@pytest.fixture
def user(db):
    """Create a user"""
    return UserFactory.create()


@pytest.fixture
def staff_jwt_token(admin_user):
    """Creates a JWT token for a staff user"""
    jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
    jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER

    payload = jwt_payload_handler(admin_user)
    payload['roles'] = ['staff']
    return jwt_encode_handler(payload)


@pytest.fixture
def jwt_token(user):
    """Creates a JWT token for a regular user"""
    jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
    jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER

    payload = jwt_payload_handler(user)
    return jwt_encode_handler(payload)


@pytest.fixture
def staff_jwt_header(staff_jwt_token):
    """Generate a staff Authorization HTTP header"""
    return dict(HTTP_AUTHORIZATION='Bearer {}'.format(staff_jwt_token))


@pytest.fixture
def jwt_header(jwt_token):
    """Generate a nonstaff Authorization HTTP header"""
    return dict(HTTP_AUTHORIZATION='Bearer {}'.format(jwt_token))
