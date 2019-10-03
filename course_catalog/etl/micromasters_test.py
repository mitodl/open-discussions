"""Tests for MicroMasters ETL functions"""
# pylint: disable=redefined-outer-name
import pytest

from course_catalog.constants import OfferedBy
from course_catalog.etl import micromasters


@pytest.fixture
def mock_micromasters_data():
    """Mock micromasters data"""
    return [
        {
            "id": 1,
            "title": "program title 1",
            "programpage_url": "http://example.com/program/1/url",
            "thumbnail_url": "http://example.com/program/1/image/url",
            "extra_field": "value",
            "courses": [
                {"edx_key": "2", "position_in_program": 2, "extra_field": "value"},
                {"edx_key": "1", "position_in_program": 1, "extra_field": "value"},
            ],
        },
        {
            "id": 2,
            "title": "program title 2",
            "programpage_url": "http://example.com/program/2/url",
            "thumbnail_url": "http://example.com/program/2/image/url",
            "extra_field": "value",
            "courses": [
                {"edx_key": "3", "position_in_program": 1, "extra_field": "value"},
                {"edx_key": "4", "position_in_program": 2, "extra_field": "value"},
            ],
        },
    ]


@pytest.fixture
def mocked_catalog_responses(mocked_responses, settings, mock_micromasters_data):
    """Mock the catalog response"""
    settings.MICROMASTERS_CATALOG_API_URL = "http://localhost/test/catalog/api"
    mocked_responses.add(
        mocked_responses.GET,
        settings.MICROMASTERS_CATALOG_API_URL,
        json=mock_micromasters_data,
    )
    yield mocked_responses


@pytest.mark.usefixtures("mocked_catalog_responses")
def test_micromasters_extract(mock_micromasters_data):
    """Verify that the extraction function calls the micromasters catalog API and returns the responses"""
    assert micromasters.extract() == mock_micromasters_data


def test_micromasters_extract_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.MICROMASTERS_CATALOG_API_URL = None
    assert micromasters.extract() == []


def test_micromasters_transform(mock_micromasters_data):
    """Test that micromasters data is correctly transformed into our normalized structure"""
    assert micromasters.transform(mock_micromasters_data) == [
        {
            "program_id": 1,
            "title": "program title 1",
            "url": "http://example.com/program/1/url",
            "image_src": "http://example.com/program/1/image/url",
            "offered_by": OfferedBy.micromasters.value,
            "courses": [{"course_id": "1"}, {"course_id": "2"}],
            "runs": [{"run_id": 1}],
        },
        {
            "program_id": 2,
            "title": "program title 2",
            "url": "http://example.com/program/2/url",
            "image_src": "http://example.com/program/2/image/url",
            "offered_by": OfferedBy.micromasters.value,
            "courses": [{"course_id": "3"}, {"course_id": "4"}],
            "runs": [{"run_id": 2}],
        },
    ]
