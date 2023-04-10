"""Opensearch fixtures"""
from types import SimpleNamespace

import pytest

from search.connection import configure_connections


@pytest.fixture(autouse=True)
def opensearch(mocker, settings):
    """Fixture for mocking opensearch"""
    settings.OPENSEARCH_URL = "test.opensearch-node1"
    mock_get_connection = mocker.patch(
        "opensearch_dsl.connections.Connections.get_connection", autospec=True
    )
    configure_connections()
    yield SimpleNamespace(conn=mock_get_connection.return_value)
