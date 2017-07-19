"""Configuration for pytest fixtures"""
import betamax
import pytest


with betamax.Betamax.configure() as config:
    config.cassette_library_dir = "cassettes"


@pytest.fixture
def praw_settings(settings):
    """Settings needed to use Api client"""
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_CLIENT_ID = 'anon_client_id'
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_SECRET = 'anon_secret'
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_USERNAME = 'anon_user'
    settings.OPEN_DISCUSSIONS_REDDIT_ANONYMOUS_PASSWORD = 'anon_pass'
    settings.OPEN_DISCUSSIONS_REDDIT_AUTHENTICATED_CLIENT_ID = 'auth_client_id'
    settings.OPEN_DISCUSSIONS_REDDIT_AUTHENTICATED_SECRET = 'auth_secret'
    settings.OPEN_DISCUSSIONS_REDDIT_URL = 'https://reddit.local'
    settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = False


@pytest.fixture
def use_betamax(mocker, betamax_session):
    """Attach the betamax session to the Api client"""
    mocker.patch('channels.api._get_requester_kwargs', return_value={
        'session': betamax_session,
    })


@pytest.fixture()
def client():
    """Similar to the builtin client but this provides the DRF client instead of the Django test client."""
    from rest_framework.test import APIClient

    return APIClient()
