"""Betamax fixtures (deprecated - discussions removed)"""
# pylint: disable=redefined-outer-name, unused-argument
import os

import pytest
import urllib3
from betamax.fixtures.pytest import _casette_name

from open_discussions.betamax_config import setup_betamax


@pytest.fixture
def cassette_name(request):
    """Returns the cassette name for this test"""
    return _casette_name(request, parametrized=True)


@pytest.fixture
def cassette_exists(cassette_name):
    """Returns True if cassette exists"""
    path = f"cassettes/{cassette_name}.json"
    return os.path.exists(path)


@pytest.fixture(autouse=True)
def use_betamax(request):
    """Determines if we're using betamax"""
    marker = request.keywords.get("betamax", None)
    if marker:
        request.getfixturevalue("configure_betamax")
        return True
    return False


@pytest.fixture
def configure_betamax(mocker, cassette_exists, request):
    """Configure betamax (deprecated - minimal implementation)"""
    setup_betamax("once" if cassette_exists is False else "none")

    # defer this until we know we need it and after setup_betamax
    betamax_parametrized_recorder = request.getfixturevalue(
        "betamax_parametrized_recorder"
    )

    urllib3.disable_warnings()

    return betamax_parametrized_recorder
