"""Common fixtures for course_catalog"""
from types import SimpleNamespace

import pytest


@pytest.fixture
def mock_course_index_functions(mocker):
    """Mocks index updating functions for courses"""
    return SimpleNamespace(
        upsert_course=mocker.patch("course_catalog.api.upsert_course")
    )
