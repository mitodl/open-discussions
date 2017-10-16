"""Configuration for pytest fixtures"""
# pylint: disable=unused-argument, redefined-outer-name
import os
import pytest

from betamax.fixtures.pytest import _casette_name as cassette_name
from rest_framework.test import APIClient

from channels.test_utils import no_ssl_verification
from open_discussions.betamax_config import setup_betamax
from profiles.factories import ProfileFactory


@pytest.fixture
def cassette_exists(request):
    """Returns True if cassette exists"""
    name = cassette_name(request, True)
    path = "cassettes/{}.json".format(name)
    return os.path.exists(path)


@pytest.fixture
def praw_settings(settings, cassette_exists):
    """Settings needed to use Api client"""
    if cassette_exists:
        settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = 'client_id'
        settings.OPEN_DISCUSSIONS_REDDIT_SECRET = 'secret'
        settings.OPEN_DISCUSSIONS_REDDIT_URL = 'https://reddit.local'
    settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = False
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 25
    return settings


@pytest.fixture
def configure_betamax(cassette_exists):
    """Configure betamax"""
    setup_betamax('once' if cassette_exists is False else 'none')


@pytest.fixture
def use_betamax(mocker, cassette_exists, praw_settings, configure_betamax, betamax_parametrized_recorder):
    """Attach the betamax session to the Api client"""
    mocker.patch('channels.api._get_session', return_value=betamax_parametrized_recorder.session)
    if cassette_exists:
        # only patch if we're running off an existing cassette
        mocker.patch('channels.api._get_refresh_token', return_value={
            'refresh_token': 'fake',
            'access_token': 'fake',
            'expires_in': 1234,
        })

    # always ignore SSL verification
    with no_ssl_verification():
        yield betamax_parametrized_recorder


@pytest.fixture()
def client():
    """Similar to the builtin client but this provides the DRF client instead of the Django test client."""
    return APIClient()


@pytest.fixture()
def logged_in_profile(client):
    """Add a Profile and logged-in User"""
    profile = ProfileFactory.create(user__username='george')
    client.force_login(profile.user)
    return profile
