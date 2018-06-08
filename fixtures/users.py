"""User fixtures"""
# pylint: disable=unused-argument, redefined-outer-name
from io import BytesIO

import pytest
from PIL import Image
from rest_framework.test import APIClient
from rest_framework_jwt.settings import api_settings

from open_discussions.factories import UserFactory
from sites.factories import AuthenticatedSiteFactory


@pytest.fixture
def user(db, use_betamax, request):
    """Create a user"""
    if use_betamax:
        return request.getfixturevalue('reddit_user')
    return UserFactory.create()


@pytest.fixture
def staff_user(db, use_betamax, request):
    """Create a staff user"""
    if use_betamax:
        request.getfixturevalue('configure_betamax')
        return request.getfixturevalue('reddit_staff_user')
    return UserFactory.create()


@pytest.fixture()
def logged_in_profile(client):
    """Add a Profile and logged-in User"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    return user.profile


@pytest.fixture
def staff_jwt_token(db, staff_user):
    """Creates a JWT token for a staff user"""
    jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
    jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER

    payload = jwt_payload_handler(staff_user)
    payload['roles'] = ['staff']
    return jwt_encode_handler(payload)


@pytest.fixture
def jwt_token(db, user):
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
def client(db):
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


@pytest.fixture
def profile_image():
    """ Create a PNG image """
    image_file = BytesIO()
    image = Image.new('RGBA', size=(250, 250), color=(256, 0, 0))
    image.save(image_file, 'png')
    image_file.seek(0)
    return image_file
