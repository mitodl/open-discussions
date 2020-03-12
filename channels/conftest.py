"""Test config for channels"""
import pytest


@pytest.fixture(autouse=True)
def mock_search_tasks(mocker):
    """Patch the helpers so they don't fire celery tasks"""
    return mocker.patch("channels.api.search_task_helpers")


@pytest.fixture
def mock_moira(mocker):
    """Return a fake mit_moira.Moira object"""
    return mocker.patch("channels.moira.Moira")


@pytest.fixture
def mock_moira_client(mocker):
    """Return a fake moira client"""
    return mocker.patch("channels.moira.get_moira_client", autospec=True)


@pytest.fixture
def mock_user_moira_lists(mocker):
    """Return a fake moira client"""
    mocked = mocker.patch("channels.moira.user_moira_lists")
    mocked.return_value = set()
    return mocked
