"""Configuration for pytest fixtures"""
# pylint: disable=unused-argument, redefined-outer-name
import betamax
import pytest

from rest_framework.test import APIClient

from open_discussions.factories import UserFactory


with betamax.Betamax.configure() as config:
    config.cassette_library_dir = "cassettes"


@pytest.fixture
def praw_settings(settings):
    """Settings needed to use Api client"""
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_CLIENT_ID = 'anon_client_id'
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_SECRET = 'anon_secret'
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_USERNAME = 'anon_user'
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_PASSWORD = 'anon_pass'
    settings.OPEN_DISCUSSIONS_REDDIT_URL = 'https://reddit.local'
    settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = False
    return settings


@pytest.fixture
def use_betamax(mocker, betamax_session, praw_settings):
    """Attach the betamax session to the Api client"""
    mocker.patch('channels.api._get_session', return_value=betamax_session)
    mocker.patch('channels.api._get_user_credentials', return_value={
        'client_id': praw_settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_CLIENT_ID,
        'client_secret': praw_settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_SECRET,
        'refresh_token': 'fake',
    })


@pytest.fixture()
def client():
    """Similar to the builtin client but this provides the DRF client instead of the Django test client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a user"""
    return UserFactory.create()
