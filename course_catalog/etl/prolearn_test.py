"""Tests for prolearn etl functions"""
import json
from datetime import datetime
from decimal import Decimal

import pytest
import pytz

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl import prolearn
from course_catalog.etl.prolearn import (
    parse_date,
    parse_image,
    parse_offered_by,
    parse_price,
    parse_topic,
)


@pytest.fixture(autouse=True)
def mock_prolearn_api_setting(settings):
    """Set the prolearn api url"""
    settings.PROLEARN_CATALOG_API_URL = "http://localhost/test/programs/api"


@pytest.fixture
def mock_csail_programs_data():
    """Mock prolearn CSAIL programs data"""
    with open("./test_json/prolearn_csail_programs.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mock_mitpe_courses_data():
    """Mock prolearn Professional Education courses data"""
    with open("./test_json/prolearn_mitpe_courses.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mocked_prolearn_programs_responses(
    mocked_responses, settings, mock_csail_programs_data
):
    """Mock the programs api response"""
    settings.PROLEARN_CATALOG_API_URL = "http://localhost/test/programs/api"
    mocked_responses.add(
        mocked_responses.POST,
        settings.PROLEARN_CATALOG_API_URL,
        json=mock_csail_programs_data,
    )
    yield mocked_responses


@pytest.fixture
def mocked_prolearn_courses_responses(
    mocked_responses, settings, mock_mitpe_courses_data
):
    """Mock the courses api response"""
    settings.PROLEARN_CATALOG_API_URL = "http://localhost/test/courses/api"
    mocked_responses.add(
        mocked_responses.POST,
        settings.PROLEARN_CATALOG_API_URL,
        json=mock_mitpe_courses_data,
    )
    yield mocked_responses


@pytest.mark.usefixtures("mocked_prolearn_programs_responses")
def test_prolearn_extract_programs(mock_csail_programs_data):
    """Verify that the extraction function calls the prolearn programs API and returns the responses"""
    assert (
        prolearn.extract_programs(PlatformType.csail.value)
        == mock_csail_programs_data["data"]["searchAPISearch"]["documents"]
    )


def test_prolearn_extract_programs_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.PROLEARN_CATALOG_API_URL = None
    assert prolearn.extract_programs(PlatformType.csail.value) == []


@pytest.mark.usefixtures("mocked_prolearn_courses_responses")
def test_prolearn_extract_courses(mock_mitpe_courses_data):
    """Verify that the extraction function calls the prolearn courses API and returns the responses"""
    assert (
        prolearn.extract_courses(PlatformType.mitpe.value)
        == mock_mitpe_courses_data["data"]["searchAPISearch"]["documents"]
    )


def test_prolearn_extract_courses_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.PROLEARN_CATALOG_API_URL = None
    assert prolearn.extract_courses(PlatformType.mitpe.value) == []


def test_prolearn_transform_programs(mock_csail_programs_data):
    """Test that prolearn program data is correctly transformed into our normalized structure"""
    extracted_data = mock_csail_programs_data["data"]["searchAPISearch"]["documents"]
    result = prolearn.transform_programs(extracted_data)
    expected = [
        {
            "program_id": program["nid"],
            "title": program["title"],
            "url": program["course_link"]
            or program["course_application_url"]
            or program["url"],
            "image_src": parse_image(program),
            "offered_by": [{"name": OfferedBy.csail.value}],
            "runs": [
                {
                    "run_id": program["nid"],
                    "platform": PlatformType.csail.value,
                    "title": program["title"],
                    "offered_by": [{"name": OfferedBy.csail.value}],
                    "prices": parse_price(program),
                    "start_date": parse_date(program["start_value"]),
                    "end_date": parse_date(program["end_value"]),
                    "best_start_date": parse_date(program["start_value"]),
                    "best_end_date": parse_date(program["end_value"]),
                }
            ],
            "topics": parse_topic(program),
            # all we need for course data is the relative positioning of courses by course_id
            "courses": [
                {
                    "course_id": course_id,
                    "platform": PlatformType.csail.value,
                    "offered_by": [{"name": OfferedBy.csail.value}],
                    "runs": [
                        {
                            "run_id": course_id,
                            "platform": PlatformType.csail.value,
                            "offered_by": [{"name": OfferedBy.csail.value}],
                        }
                    ],
                }
                for course_id in sorted(program["field_related_courses_programs"])
            ],
        }
        for program in extracted_data
    ]
    assert expected == result


def test_prolearn_transform_courses(mock_mitpe_courses_data):
    """Test that prolearn courses data is correctly transformed into our normalized structure"""
    extracted_data = mock_mitpe_courses_data["data"]["searchAPISearch"]["documents"]
    result = prolearn.transform_courses(extracted_data)
    expected = [
        {
            "course_id": course["nid"],
            "platform": PlatformType.mitpe.value,
            "title": course["title"],
            "image_src": parse_image(course),
            "offered_by": [{"name": OfferedBy.mitpe.value}],
            "short_description": course["body"],
            "published": True,
            "topics": parse_topic(course),
            "runs": [
                {
                    "run_id": course["nid"],
                    "title": course["title"],
                    "image_src": parse_image(course),
                    "offered_by": [{"name": OfferedBy.mitpe.value}],
                    "short_description": course["body"],
                    "platform": PlatformType.mitpe.value,
                    "start_date": parse_date(course["start_value"]),
                    "end_date": parse_date(course["end_value"]),
                    "best_start_date": parse_date(course["start_value"]),
                    "best_end_date": parse_date(course["end_value"]),
                    "published": True,
                    "prices": parse_price(course),
                    "url": course["course_link"]
                    or course["course_application_url"]
                    or course["url"],
                    "raw_json": course,
                }
            ],
        }
        for course in extracted_data
    ]
    assert expected == result


@pytest.mark.parametrize(
    "date_ints, expected_dt",
    [
        [[1670932800], datetime(2022, 12, 13, 12, 0, tzinfo=pytz.UTC)],
        [[], None],
        [[None], None],
    ],
)
def test_parse_date(date_ints, expected_dt):
    """Integer array should be parsed into correct datetimes"""
    assert parse_date(date_ints) == expected_dt


@pytest.mark.parametrize(
    "price_str, price_list",
    [
        ["$5,342", [{"price": round(Decimal(5342), 2)}]],
        ["5.34", [{"price": round(Decimal(5.34), 2)}]],
        [None, []],
        ["", []],
    ],
)
def test_parse_price(price_str, price_list):
    """Price string should be parsed into correct Decimal list"""
    document = {"field_price": price_str}
    assert parse_price(document) == price_list


@pytest.mark.parametrize(
    "topic,expected",
    [
        ["Blockchain", "Computer Science"],
        ["Systems Engineering", "Systems Engineering"],
        ["Other Business", "Business"],
        ["Other Technology", None],
    ],
)
def test_parse_topic(topic, expected):
    """parse_topic should return the matching OCW topic"""
    document = {"ucc_name": topic}
    if expected:
        assert parse_topic(document)[0]["name"] == expected
    else:
        assert parse_topic(document) == []


@pytest.mark.parametrize(
    "department,offered_by",
    [
        ["MIT CSAIL", OfferedBy.csail.value],
        ["MIT Center for Transportation & Logistics", OfferedBy.ctl.value],
        ["MIT Other", None],
    ],
)
def test_offered_by(department, offered_by):
    document = {"department": department}
    assert parse_offered_by(document) == offered_by


@pytest.mark.parametrize(
    "featured_image_url,expected_url",
    [
        ["/a/b/c.jog", "http://localhost/a/b/c.jog"],
        ["", None],
        [None, None],
    ],
)
def test_parse_image(featured_image_url, expected_url):
    """parse_image should return the expected url"""
    document = {"featured_image_url": featured_image_url}
    assert parse_image(document) == expected_url
