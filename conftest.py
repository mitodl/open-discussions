"""Configuration for pytest fixtures"""
# pylint: disable=unused-argument, redefined-outer-name
import factory
import pytest
from rest_framework.test import APIClient
from rest_framework_jwt.settings import api_settings

from open_discussions.factories import UserFactory
from sites.factories import AuthenticatedSiteFactory

pytestmark = pytest.mark.usefixtures('authenticated_site')


@pytest.fixture(scope="function")
def randomness():
    """Ensure a fixed seed for factoryboy"""
    factory.fuzzy.reseed_random("happy little clouds")


@pytest.fixture
def user(db):
    """Create a user"""
    return UserFactory.create()


@pytest.fixture
def staff_user(db):
    """Create a staff user"""
    return UserFactory.create()


@pytest.fixture
def staff_jwt_token(staff_user):
    """Creates a JWT token for a staff user"""
    jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
    jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER

    payload = jwt_payload_handler(staff_user)
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


@pytest.fixture
def client():
    """
    Similar to the builtin client but this provides the DRF client instead of the Django test client.
    """
    return APIClient()


@pytest.fixture
def staff_client(client, staff_user):
    """Version of the client that is authenticated with the staff_user"""
    client.force_login(staff_user)
    return client


@pytest.fixture
def authenticated_site(db, settings):
    """The authenticated site"""
    return AuthenticatedSiteFactory.create(key=settings.OPEN_DISCUSSIONS_DEFAULT_SITE_KEY)
