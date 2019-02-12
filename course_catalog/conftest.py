"""Common fixtures for course_catalog"""
from types import SimpleNamespace

import pytest


@pytest.fixture
def mock_course_index_functions(mocker):
    """Mocks index updating functions for courses"""
    return SimpleNamespace(
        update_course=mocker.patch("course_catalog.task_helpers.update_course"),
        index_new_course=mocker.patch("course_catalog.task_helpers.index_new_course"),
    )
