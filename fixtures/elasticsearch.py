"""Elasticsearch fixtures"""
from types import SimpleNamespace

import pytest

from search.connection import configure_connections


@pytest.fixture(autouse=True)
def elasticsearch(mocker, settings):
    """Fixture for mocking elasticsearch"""
    settings.ELASTICSEARCH_URL = "test.elastic"
    mock_get_connection = mocker.patch(
        "opensearch_dsl.search.get_connection", autospec=True
    )
    configure_connections()
    yield SimpleNamespace(conn=mock_get_connection.return_value)
