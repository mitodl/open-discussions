"""Tests for MicroMasters ETL functions"""
# pylint: disable=redefined-outer-name
from datetime import datetime
import json

import pytest

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl import xpro
from course_catalog.etl.xpro import _parse_datetime
from open_discussions.test_utils import any_instance_of


@pytest.fixture
def mock_xpro_data():
    """Mock xpro data"""
    with open("./test_json/xpro_programs.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mocked_catalog_responses(mocked_responses, settings, mock_xpro_data):
    """Mock the catalog response"""
    settings.XPRO_CATALOG_API_URL = "http://localhost/test/catalog/api"
    mocked_responses.add(
        mocked_responses.GET, settings.XPRO_CATALOG_API_URL, json=mock_xpro_data
    )
    yield mocked_responses


@pytest.mark.usefixtures("mocked_catalog_responses")
def test_xpro_extract(mock_xpro_data):
    """Verify that the extraction function calls the xpro catalog API and returns the responses"""
    assert xpro.extract() == mock_xpro_data


def test_xpro_extract_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.XPRO_CATALOG_API_URL = None
    assert xpro.extract() == []


def test_xpro_transform(mock_xpro_data):
    """Test that xpro data is correctly transformed into our normalized structure"""
    result = xpro.transform(mock_xpro_data)
    expected = [
        {
            "program_id": program_data["readable_id"],
            "title": program_data["title"],
            "image_src": program_data["thumbnail_url"],
            "short_description": program_data["description"],
            "offered_by": OfferedBy.xpro.value,
            "published": bool(program_data["current_price"]),
            "url": program_data["url"],
            "runs": [
                {
                    "run_id": program_data["readable_id"],
                    "platform": PlatformType.xpro.value,
                    "start_date": any_instance_of(datetime, type(None)),
                    "end_date": any_instance_of(datetime, type(None)),
                    "enrollment_start": any_instance_of(datetime, type(None)),
                    "best_start_date": _parse_datetime(
                        program_data["enrollment_start"] or program_data["start_date"]
                    ),
                    "best_end_date": _parse_datetime(program_data["end_date"]),
                    "prices": [{"price": program_data["current_price"], "mode": ""}]
                    if program_data["current_price"]
                    else [],
                    "title": program_data["title"],
                    "short_description": program_data["description"],
                    "offered_by": OfferedBy.xpro.value,
                }
            ],
            "courses": [
                {
                    "course_id": course_data["readable_id"],
                    "platform": PlatformType.xpro.value,
                    "title": course_data["title"],
                    "image_src": course_data["thumbnail_url"],
                    "short_description": course_data["description"],
                    "offered_by": OfferedBy.xpro.value,
                    "published": any(
                        map(
                            lambda course_run: course_run.get("current_price", None),
                            course_data["courseruns"],
                        )
                    ),
                    "runs": [
                        {
                            "run_id": course_run_data["courseware_id"],
                            "platform": PlatformType.xpro.value,
                            "start_date": any_instance_of(datetime, type(None)),
                            "end_date": any_instance_of(datetime, type(None)),
                            "enrollment_start": any_instance_of(datetime, type(None)),
                            "enrollment_end": any_instance_of(datetime, type(None)),
                            "best_start_date": _parse_datetime(
                                course_run_data["enrollment_start"]
                                or course_run_data["start_date"]
                            ),
                            "best_end_date": _parse_datetime(
                                course_run_data["enrollment_end"]
                                or course_run_data["end_date"]
                            ),
                            "offered_by": OfferedBy.xpro.value,
                            "published": bool(course_run_data["current_price"]),
                            "prices": [{"price": course_run_data["current_price"]}]
                            if course_run_data["current_price"]
                            else [],
                            "instructors": [
                                {"full_name": instructor["name"]}
                                for instructor in course_run_data["instructors"]
                            ],
                        }
                        for course_run_data in course_data["courseruns"]
                    ],
                }
                for course_data in program_data["courses"]
            ],
        }
        for program_data in mock_xpro_data
    ]
    assert expected == result
