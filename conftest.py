"""Project conftest"""
# pylint: disable=wildcard-import, unused-wildcard-import
import pytest

from fixtures.aws import *
from fixtures.betamax import *
from fixtures.common import *
from fixtures.elasticsearch import *
from fixtures.reddit import *
from fixtures.users import *
from open_discussions.exceptions import DoNotUseRequestException


@pytest.fixture(autouse=True)
def default_settings(settings):
    """Set default settings for all tests"""
    settings.DISABLE_WEBPACK_LOADER_STATS = True
    settings.OPEN_DISCUSSIONS_BASE_URL = "http://localhost:8063/"
    settings.OPEN_DISCUSSIONS_COOKIE_NAME = "cookie_monster"
    settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN = "localhost"
    settings.OPEN_DISCUSSIONS_DEFAULT_SITE_KEY = "mm_test"
    settings.MAILGUN_SENDER_DOMAIN = "other.fake.site"
    settings.MAILGUN_KEY = "fake_mailgun_key"
    settings.ELASTICSEARCH_INDEX = "testindex"
    settings.INDEXING_API_USERNAME = "mitodl"
    settings.OPEN_DISCUSSIONS_FEATURES_DEFAULT = False


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
