"""Configuration for pytest fixtures"""
# pylint: disable=unused-argument, redefined-outer-name
import pytest

from rest_framework.test import APIClient

from open_discussions.betamax_config import setup_betamax
from open_discussions.factories import UserFactory


@pytest.fixture
def praw_settings(settings):
    """Settings needed to use Api client"""
    settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID = 'client_id'
    settings.OPEN_DISCUSSIONS_REDDIT_SECRET = 'secret'
    settings.OPEN_DISCUSSIONS_REDDIT_URL = 'https://reddit.local'
    settings.OPEN_DISCUSSIONS_REDDIT_VALIDATE_SSL = False
    return settings


@pytest.fixture
def configure_betamax():
    """Configure betamax"""
    setup_betamax()


@pytest.fixture
def use_betamax(mocker, configure_betamax, betamax_recorder, praw_settings):
    """Attach the betamax session to the Api client"""
    mocker.patch('channels.api._get_session', return_value=betamax_recorder.session)
    mocker.patch('channels.api._get_user_credentials', return_value={
        'client_id': praw_settings.OPEN_DISCUSSIONS_REDDIT_CLIENT_ID,
        'client_secret': praw_settings.OPEN_DISCUSSIONS_REDDIT_SECRET,
        'refresh_token': 'fake',
    })
    return betamax_recorder


@pytest.fixture()
def client():
    """Similar to the builtin client but this provides the DRF client instead of the Django test client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a user"""
    return UserFactory.create()
