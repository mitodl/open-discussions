"""Test config for channels"""
import pytest


@pytest.fixture
def mock_moira(mocker):
    """Return a fake mit_moira.Moira object"""
    return mocker.patch("moira_lists.moira_api.Moira")


@pytest.fixture
def mock_moira_client(mocker):
    """Return a fake moira client"""
    return mocker.patch("moira_lists.moira_api.get_moira_client", autospec=True)


@pytest.fixture
def mock_user_moira_lists(mocker):
    """Return a fake moira client"""
    mocked = mocker.patch("moira_lists.moira_api.user_moira_lists")
    mocked.return_value = set()
    return mocked
