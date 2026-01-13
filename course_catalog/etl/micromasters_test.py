"""Tests for MicroMasters ETL functions"""
# pylint: disable=redefined-outer-name
import pytest

from course_catalog.constants import PlatformType
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
                {
                    "edx_key": "2",
                    "position_in_program": 2,
                    "extra_field": "value",
                    "course_runs": [{"edx_course_key": None}, {"edx_course_key": ""}],
                },
                {
                    "edx_key": "1",
                    "position_in_program": 1,
                    "extra_field": "value",
                    "course_runs": [{"edx_course_key": "course_key_1"}],
                },
            ],
            "instructors": [
                {"name": "Dr. Doofenshmirtz"},
                {"name": "Joey Jo Jo Shabadoo"},
            ],
            "topics": [{"name": "program"}, {"name": "first"}],
            "total_price": "123.45",
            "start_date": "2019-10-04T20:13:26.367297Z",
            "end_date": None,
            "enrollment_start": "2019-09-29T20:13:26.367297Z",
        },
        {
            "id": 2,
            "title": "program title 2",
            "programpage_url": "http://example.com/program/2/url",
            "thumbnail_url": "http://example.com/program/2/image/url",
            "extra_field": "value",
            "courses": [
                {
                    "edx_key": "3",
                    "position_in_program": 1,
                    "extra_field": "value",
                    "course_runs": [],
                },
                {
                    "edx_key": "4",
                    "position_in_program": 2,
                    "extra_field": "value",
                    "course_runs": [{"edx_course_key": "course_key_4"}],
                },
            ],
            "instructors": [{"name": "Mia"}, {"name": "Leah"}],
            "topics": [{"name": "program"}, {"name": "second"}],
            "start_date": None,
            "end_date": "2019-10-04T20:14:50.271027Z",
            "enrollment_start": None,
            "total_price": "87.65",
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
    return mocked_responses


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
            "offered_by": micromasters.OFFERED_BY,
            "courses": [
                {
                    "course_id": "1",
                    "platform": PlatformType.mitx.value,
                    "offered_by": micromasters.OFFERED_BY,
                    "runs": [
                        {
                            "run_id": "course_key_1",
                            "platform": PlatformType.mitx.value,
                            "offered_by": micromasters.OFFERED_BY,
                        }
                    ],
                },
                {
                    "course_id": "2",
                    "platform": PlatformType.mitx.value,
                    "offered_by": micromasters.OFFERED_BY,
                    "runs": [],
                },
            ],
            "runs": [
                {
                    "run_id": 1,
                    "platform": PlatformType.micromasters.value,
                    "title": "program title 1",
                    "offered_by": micromasters.OFFERED_BY,
                    "instructors": [
                        {"full_name": "Dr. Doofenshmirtz"},
                        {"full_name": "Joey Jo Jo Shabadoo"},
                    ],
                    "prices": [{"price": "123.45"}],
                    "start_date": "2019-10-04T20:13:26.367297Z",
                    "end_date": None,
                    "enrollment_start": "2019-09-29T20:13:26.367297Z",
                    "best_start_date": "2019-09-29T20:13:26.367297Z",
                    "best_end_date": None,
                }
            ],
            "topics": [{"name": "program"}, {"name": "first"}],
        },
        {
            "program_id": 2,
            "title": "program title 2",
            "url": "http://example.com/program/2/url",
            "image_src": "http://example.com/program/2/image/url",
            "offered_by": micromasters.OFFERED_BY,
            "courses": [
                {
                    "course_id": "3",
                    "platform": PlatformType.mitx.value,
                    "offered_by": micromasters.OFFERED_BY,
                    "runs": [],
                },
                {
                    "course_id": "4",
                    "platform": PlatformType.mitx.value,
                    "offered_by": micromasters.OFFERED_BY,
                    "runs": [
                        {
                            "run_id": "course_key_4",
                            "platform": PlatformType.mitx.value,
                            "offered_by": micromasters.OFFERED_BY,
                        }
                    ],
                },
            ],
            "runs": [
                {
                    "run_id": 2,
                    "platform": PlatformType.micromasters.value,
                    "title": "program title 2",
                    "offered_by": micromasters.OFFERED_BY,
                    "instructors": [{"full_name": "Mia"}, {"full_name": "Leah"}],
                    "prices": [{"price": "87.65"}],
                    "start_date": None,
                    "end_date": "2019-10-04T20:14:50.271027Z",
                    "enrollment_start": None,
                    "best_start_date": None,
                    "best_end_date": "2019-10-04T20:14:50.271027Z",
                }
            ],
            "topics": [{"name": "program"}, {"name": "second"}],
        },
    ]
