"""Tests for MITx Online ETL functions"""
import json

# pylint: disable=redefined-outer-name
from datetime import datetime
from itertools import chain
from urllib.parse import urljoin

import pytest

from course_catalog.constants import PlatformType
from course_catalog.etl import mitxonline
from course_catalog.etl.mitxonline import _parse_datetime, parse_page_attribute
from course_catalog.etl.utils import UCC_TOPIC_MAPPINGS
from open_discussions.test_utils import any_instance_of

pytestmark = pytest.mark.django_db


@pytest.fixture
def mock_mitxonline_programs_data():
    """Mock mitxonline data"""
    with open("./test_json/mitxonline_programs.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mock_mitxonline_courses_data():
    """Mock mitxonline data"""
    with open("./test_json/mitxonline_courses.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mocked_mitxonline_programs_responses(
    mocked_responses, settings, mock_mitxonline_programs_data
):
    """Mock the programs api response"""
    settings.MITX_ONLINE_PROGRAMS_API_URL = "http://localhost/test/programs/api"
    mocked_responses.add(
        mocked_responses.GET,
        settings.MITX_ONLINE_PROGRAMS_API_URL,
        json=mock_mitxonline_programs_data,
    )
    yield mocked_responses


@pytest.fixture
def mocked_mitxonline_courses_responses(
    mocked_responses, settings, mock_mitxonline_courses_data
):
    """Mock the courses api response"""
    settings.MITX_ONLINE_COURSES_API_URL = "http://localhost/test/courses/api"
    mocked_responses.add(
        mocked_responses.GET,
        settings.MITX_ONLINE_COURSES_API_URL,
        json=mock_mitxonline_courses_data,
    )
    yield mocked_responses


@pytest.mark.usefixtures("mocked_mitxonline_programs_responses")
def test_mitxonline_extract_programs(mock_mitxonline_programs_data):
    """Verify that the extraction function calls the mitxonline programs API and returns the responses"""
    assert mitxonline.extract_programs() == mock_mitxonline_programs_data


def test_mitxonline_extract_programs_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.MITX_ONLINE_PROGRAMS_API_URL = None
    assert mitxonline.extract_programs() == []


@pytest.mark.usefixtures("mocked_mitxonline_courses_responses")
def test_mitxonline_extract_courses(mock_mitxonline_courses_data):
    """Verify that the extraction function calls the mitxonline courses API and returns the responses"""
    assert mitxonline.extract_courses() == mock_mitxonline_courses_data


def test_mitxonline_extract_courses_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.MITX_ONLINE_COURSES_API_URL = None
    assert mitxonline.extract_courses() == []


def test_mitxonline_transform_programs(mock_mitxonline_programs_data):
    """Test that mitxonline program data is correctly transformed into our normalized structure"""
    result = mitxonline.transform_programs(mock_mitxonline_programs_data)
    expected = [
        {
            "program_id": program_data["readable_id"],
            "title": program_data["title"],
            "image_src": parse_page_attribute(
                program_data, "feature_image_src", is_url=True
            ),
            "short_description": program_data.get("page", {}).get("description", None),
            "offered_by": mitxonline.OFFERED_BY,
            "published": bool(
                program_data.get("page", {}).get("page_url", None) is not None
            ),
            "url": parse_page_attribute(program_data, "page_url", is_url=True),
            "topics": [
                {"name": topic_name}
                for topic_name in chain.from_iterable(
                    [
                        UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]])
                        for topic in program_data.get("topics", [])
                    ]
                )
            ],
            "runs": [
                {
                    "run_id": program_data["readable_id"],
                    "platform": PlatformType.mitxonline.value,
                    "start_date": any_instance_of(datetime, type(None)),
                    "end_date": any_instance_of(datetime, type(None)),
                    "enrollment_start": any_instance_of(datetime, type(None)),
                    "best_start_date": _parse_datetime(
                        program_data["enrollment_start"] or program_data["start_date"]
                    ),
                    "published": bool(
                        program_data.get("page", {}).get("page_url", None) is not None
                    ),
                    "image_src": parse_page_attribute(
                        program_data, "feature_image_src", is_url=True
                    ),
                    "best_end_date": _parse_datetime(program_data["end_date"]),
                    "title": program_data["title"],
                    "short_description": program_data.get("description", None),
                    "offered_by": mitxonline.OFFERED_BY,
                    "url": parse_page_attribute(program_data, "page_url", is_url=True),
                }
            ],
            "courses": [
                {
                    "course_id": course_data["readable_id"],
                    "platform": PlatformType.mitxonline.value,
                    "title": course_data["title"],
                    "image_src": parse_page_attribute(
                        course_data, "feature_image_src", is_url=True
                    ),
                    "short_description": course_data.get("page", {}).get(
                        "description", None
                    ),
                    "offered_by": mitxonline.OFFERED_BY,
                    "published": bool(
                        course_data.get("page", {}).get("page_url", None)
                    ),
                    "url": parse_page_attribute(course_data, "page_url", is_url=True),
                    "topics": [
                        {"name": topic_name}
                        for topic_name in chain.from_iterable(
                            [
                                UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]])
                                for topic in course_data.get("topics", [])
                            ]
                        )
                    ],
                    "runs": [
                        {
                            "run_id": course_run_data["courseware_id"],
                            "title": course_run_data["title"],
                            "image_src": parse_page_attribute(
                                course_run_data, "feature_image_src", is_url=True
                            ),
                            "platform": PlatformType.mitxonline.value,
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
                            "url": parse_page_attribute(
                                course_run_data, "page_url", is_url=True
                            ),
                            "offered_by": mitxonline.OFFERED_BY,
                            "short_description": any_instance_of(str, type(None)),
                            "published": bool(
                                parse_page_attribute(course_run_data, "page_url")
                            ),
                            "prices": [
                                {"price": price}
                                for price in [
                                    parse_page_attribute(
                                        course_run_data, "current_price"
                                    )
                                ]
                                if price is not None
                            ],
                            "instructors": [
                                {"full_name": instructor["name"]}
                                for instructor in parse_page_attribute(
                                    course_run_data, "instructors", is_list=True
                                )
                            ],
                        }
                        for course_run_data in course_data["courseruns"]
                    ],
                }
                for course_data in program_data["courses"]
                if "PROCTORED EXAM" not in course_data["title"]
            ],
        }
        for program_data in mock_mitxonline_programs_data
    ]
    assert expected == result


def test_mitxonline_transform_courses(settings, mock_mitxonline_courses_data):
    """Test that mitxonline courses data is correctly transformed into our normalized structure"""
    result = mitxonline.transform_courses(mock_mitxonline_courses_data)
    expected = [
        {
            "course_id": course_data["readable_id"],
            "platform": PlatformType.mitxonline.value,
            "title": course_data["title"],
            "image_src": parse_page_attribute(
                course_data, "feature_image_src", is_url=True
            ),
            "short_description": course_data.get("page", {}).get("description", None),
            "offered_by": mitxonline.OFFERED_BY,
            "published": course_data.get("page", {}).get("page_url", None) is not None,
            "topics": [
                {"name": topic_name}
                for topic_name in chain.from_iterable(
                    [
                        UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]])
                        for topic in course_data.get("topics", [])
                    ]
                )
            ],
            "url": urljoin(
                settings.MITX_ONLINE_BASE_URL,
                course_data["page"]["page_url"],
            )
            if course_data.get("page", {}).get("page_url")
            else None,
            "runs": [
                {
                    "run_id": course_run_data["courseware_id"],
                    "title": course_run_data["title"],
                    "image_src": parse_page_attribute(
                        course_run_data, "feature_image_src", is_url=True
                    ),
                    "url": urljoin(
                        settings.MITX_ONLINE_BASE_URL,
                        course_run_data["page"]["page_url"],
                    )
                    if course_run_data.get("page", {}).get("page_url")
                    else None,
                    "short_description": course_run_data.get("page", {}).get(
                        "description", None
                    ),
                    "platform": PlatformType.mitxonline.value,
                    "start_date": any_instance_of(datetime, type(None)),
                    "end_date": any_instance_of(datetime, type(None)),
                    "enrollment_start": any_instance_of(datetime, type(None)),
                    "enrollment_end": any_instance_of(datetime, type(None)),
                    "best_start_date": _parse_datetime(
                        course_run_data["enrollment_start"]
                        or course_run_data["start_date"]
                    ),
                    "best_end_date": _parse_datetime(
                        course_run_data["enrollment_end"] or course_run_data["end_date"]
                    ),
                    "offered_by": mitxonline.OFFERED_BY,
                    "published": True,
                    "prices": parse_page_attribute(
                        course_run_data, "current_price", is_list=True
                    )
                    if course_run_data.get("current_price", None)
                    else [],
                    "instructors": [
                        {"full_name": instructor["name"]}
                        for instructor in parse_page_attribute(
                            course_run_data, "instructors", is_list=True
                        )
                    ],
                }
                for course_run_data in course_data["courseruns"]
            ],
        }
        for course_data in mock_mitxonline_courses_data
        if "PROCTORED EXAM" not in course_data["title"]
    ]
    assert expected == result
