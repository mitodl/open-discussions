"""Common config for pytest and friends"""
# pylint: disable=unused-argument, redefined-outer-name
import logging
import warnings
from types import SimpleNamespace

import factory
import pytest
import responses
from pytest_mock import PytestMockWarning
from urllib3.exceptions import InsecureRequestWarning

from open_discussions.factories import UserFactory


@pytest.fixture(autouse=True)
def silence_factory_logging():
    """Only show factory errors"""
    logging.getLogger("factory").setLevel(logging.ERROR)


@pytest.fixture(autouse=True)
def warnings_as_errors():
    """Convert warnings to errors. This should only affect unit tests, letting pylint and other plugins
    raise DeprecationWarnings without erroring.
    """
    try:
        warnings.resetwarnings()
        warnings.simplefilter("error")
        # For celery
        warnings.simplefilter("ignore", category=ImportWarning)
        warnings.filterwarnings("ignore", category=InsecureRequestWarning)
        warnings.filterwarnings("ignore", category=PytestMockWarning)
        warnings.filterwarnings("ignore", category=ResourceWarning)
        warnings.filterwarnings(
            "ignore",
            message="'async' and 'await' will become reserved keywords in Python 3.7",
            category=DeprecationWarning,
        )
        # Ignore deprecation warnings in third party libraries
        warnings.filterwarnings(
            "ignore",
            module=".*(api_jwt|api_jws|rest_framework_jwt|betamax|astroid|celery).*",
            category=DeprecationWarning,
        )
        yield
    finally:
        warnings.resetwarnings()


@pytest.fixture(scope="function")
def randomness():
    """Ensure a fixed seed for factoryboy"""
    factory.fuzzy.reseed_random("happy little clouds")


@pytest.fixture
def mocked_celery(mocker):
    """Mock object that patches certain celery functions"""
    exception_class = TabError
    replace_mock = mocker.patch(
        "celery.app.task.Task.replace", autospec=True, side_effect=exception_class
    )
    group_mock = mocker.patch("celery.group", autospec=True)
    chain_mock = mocker.patch("celery.chain", autospec=True)

    return SimpleNamespace(
        replace=replace_mock,
        group=group_mock,
        chain=chain_mock,
        replace_exception_class=exception_class,
    )


@pytest.fixture
def mock_search_tasks(mocker):
    """Patch search tasks so they no-op"""
    return mocker.patch("search.search_index_helpers")


@pytest.fixture
def indexing_user(settings):
    """Sets and returns the indexing user"""
    user = UserFactory.create()
    settings.INDEXING_API_USERNAME = user.username
    return user


@pytest.fixture
def mocked_responses():
    """Mock responses fixture"""
    with responses.RequestsMock() as rsps:
        yield rsps


@pytest.fixture(autouse=True)
def default_settings(settings):
    """Default settings for tests"""
    settings.AKISMET_API_KEY = None
    settings.AKISMET_BLOG_URL = None
