"""Test config for channels"""
import pytest


@pytest.fixture(autouse=True)
def mock_search_tasks(mocker):
    """Patch the helpers so they don't fire celery tasks"""
    return mocker.patch("channels.api.search_index_helpers")
