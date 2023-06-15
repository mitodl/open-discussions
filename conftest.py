"""Project conftest"""
# pylint: disable=wildcard-import, unused-wildcard-import
import pytest

from fixtures.aws import *
from fixtures.betamax import *
from fixtures.common import *
from fixtures.opensearch import *
from fixtures.reddit import *
from fixtures.users import *
from open_discussions.exceptions import DoNotUseRequestException


@pytest.fixture(autouse=True)
def prevent_requests(mocker, request):
    """Patch requests to error on request by default"""
    if (
        "betamax" in request.keywords
        or "use_betamax" in request.fixturenames
        or "mocked_responses" in request.fixturenames
    ):
        return
    mocker.patch(
        "requests.sessions.Session.request",
        autospec=True,
        side_effect=DoNotUseRequestException,
    )
