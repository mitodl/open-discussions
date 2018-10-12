"""Betamax fixtures"""
# pylint: disable=redefined-outer-name, unused-argument
import os

import pytest
import urllib3
from betamax.fixtures.pytest import _casette_name

from channels.test_utils import no_ssl_verification
from open_discussions.betamax_config import setup_betamax


@pytest.fixture
def cassette_name(request):
    """Returns the cassette name for this test"""
    return _casette_name(request, parametrized=True)


@pytest.fixture
def cassette_exists(cassette_name):
    """Returns True if cassette exists"""
    path = "cassettes/{}.json".format(cassette_name)
    return os.path.exists(path)


@pytest.fixture(autouse=True)
def use_betamax(request):
    """Determines if we're using betamax"""
    marker = request.keywords.get("betamax", None)
    if marker:
        request.getfixturevalue("configure_betamax")
        return True
    return False


@pytest.fixture()
def configure_betamax(mocker, cassette_exists, praw_settings, request):
    """Configure betamax"""
    setup_betamax("once" if cassette_exists is False else "none")

    # defer this until we know we need it and after setup_betamax
    betamax_parametrized_recorder = request.getfixturevalue(
        "betamax_parametrized_recorder"
    )

    mocker.patch(
        "channels.api._get_session", return_value=betamax_parametrized_recorder.session
    )
    if cassette_exists:
        # only patch if we're running off an existing cassette
        mocker.patch(
            "channels.api._get_refresh_token",
            return_value={
                "refresh_token": "fake",
                "access_token": "fake",
                "expires_in": 1234,
            },
        )

    urllib3.disable_warnings()

    # always ignore SSL verification
    with no_ssl_verification():
        yield betamax_parametrized_recorder
