"""Add context manager to make recording reddit requests simpler"""
from contextlib import contextmanager
from unittest.mock import patch

from betamax import Betamax
import requests

from channels.api import Api
from open_discussions.betamax_config import setup_betamax


@contextmanager
def record(name, user):
    """
    Record a cassette of some reddit communication.

    Usage:
        with record('cassette_name', my_user) as api:
            api.update_channel_index('channel', title='new_title')

    Args:
        name (str): The name of the new cassette
        user (django.contrib.auth.models.User): User to authenticate with
    """
    setup_betamax()
    session = requests.Session()
    session.verify = False

    with patch("channels.api._get_session", return_value=session):
        with Betamax(session).use_cassette(name):
            api = Api(user)
            yield api
