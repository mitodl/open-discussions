"""Common ETL test fixtures"""
import json

import pytest


@pytest.fixture
def mitx_course_data():
    """Catalog data fixture"""
    with open("./test_json/test_mitx_course.json", "r") as f:
        yield json.loads(f.read())


@pytest.fixture
def non_mitx_course_data():
    """Catalog data fixture"""
    with open("./test_json/test_non_mitx_course.json", "r") as f:
        yield json.loads(f.read())
