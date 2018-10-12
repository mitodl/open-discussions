"""Project conftest"""
# pylint: disable=wildcard-import, unused-wildcard-import
import pytest

from fixtures.betamax import *
from fixtures.common import *
from fixtures.reddit import *
from fixtures.users import *
from open_discussions.exceptions import NoRequestException


@pytest.fixture(autouse=True)
def prevent_requests(mocker, request):
    """Patch requests to error on request by default"""
    if "betamax" in request.keywords:
        return
    mocker.patch(
        "requests.sessions.Session.request",
        autospec=True,
        side_effect=NoRequestException,
    )
