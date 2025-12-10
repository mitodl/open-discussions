"""Test course_catalog utils
"""
import json
from datetime import datetime

import pytest
import pytz

from course_catalog.constants import PlatformType
from course_catalog.utils import (
    get_course_url,
    get_ocw_department_list,
    get_ocw_topics,
    load_course_blocklist,
    load_course_duplicates,
    parse_instructors,
    safe_load_json,
    semester_year_to_date,
)


@pytest.fixture(name="test_instructors_data")
def fixture_test_instructors_data():
    """Test instructors data"""
    with open("./test_json/test_instructors_data.json") as test_data:
        return json.load(test_data)["instructors"]


@pytest.mark.parametrize(
    "course_id,course_json,platform, expected",
    [
        [
            "MITX-01",
            {"course_runs": [{"marketing_url": "https://www.edx.org/course/someurl"}]},
            PlatformType.mitx.value,
            "https://www.edx.org/course/someurl",
        ],
        [
            "MITX-01",
            {"course_runs": [{"marketing_url": "https://www.edx.org/"}]},
            PlatformType.mitx.value,
            "https://courses.edx.org/courses/MITX-01/course/",
        ],
        [
            "MITX-01",
            {"course_runs": [{"marketing_url": ""}]},
            PlatformType.mitx.value,
            "https://courses.edx.org/courses/MITX-01/course/",
        ],
        [
            "MITX-01",
            {"course_runs": [{}]},
            PlatformType.mitx.value,
            "https://courses.edx.org/courses/MITX-01/course/",
        ],
        [
            "MITX-01",
            {},
            PlatformType.mitx.value,
            "https://courses.edx.org/courses/MITX-01/course/",
        ],
        [
            "e9387c256bae4ca99cce88fd8b7f8272",
            {"url": "/someurl"},
            PlatformType.ocw.value,
            "http://ocw.mit.edu/someurl",
        ],
        ["e9387c256bae4ca99cce88fd8b7f8272", {"url": ""}, PlatformType.ocw.value, None],
        ["e9387c256bae4ca99cce88fd8b7f8272", {}, PlatformType.ocw.value, None],
    ],
)
def test_get_course_url(course_id, course_json, platform, expected):
    """Test that url's are calculated as expected"""
    actual_url = get_course_url(course_id, course_json, platform)
    if expected is None:
        assert actual_url is expected
    else:
        assert actual_url == expected


@pytest.mark.parametrize(
    "semester,year,ending, expected",
    [
        ["spring", 2020, True, "2020-05-31"],
        ["spring", 2020, False, "2020-01-01"],
        ["fall", 2020, True, "2020-12-31"],
        ["fall", 2020, False, "2020-09-01"],
        ["summer", 2021, True, "2021-08-30"],
        ["summer", 2021, False, "2021-06-01"],
        ["spring", None, False, None],
        [None, 2020, False, None],
        ["something", 2020, False, None],
        ["something", 2020, True, None],
        ["January IAP", 2018, False, "2018-01-01"],
        ["January IAP", 2018, True, "2018-01-31"],
    ],
)
def test_semester_year_to_date(semester, year, ending, expected):
    """Test that a correct rough date is returned for semester and year"""
    if expected is None:
        assert semester_year_to_date(semester, year, ending=ending) is None
    else:
        assert semester_year_to_date(
            semester, year, ending=ending
        ) == datetime.strptime(expected, "%Y-%m-%d").replace(tzinfo=pytz.UTC)


@pytest.mark.parametrize("url", [None, "http://test.me"])
def test_load_blocklist(url, settings, mocker):
    """Test that a list of course ids is returned if a URL is set"""
    settings.BLOCKLISTED_COURSES_URL = url
    file_content = [b"MITX_Test1_FAKE", b"MITX_Test2_Fake", b"OCW_Test_Fake"]
    mock_request = mocker.patch(
        "requests.get",
        autospec=True,
        return_value=mocker.Mock(iter_lines=mocker.Mock(return_value=file_content)),
    )
    blocklist = load_course_blocklist()
    if url is None:
        mock_request.assert_not_called()
        assert blocklist == []
    else:
        mock_request.assert_called_once_with(url, timeout=settings.REQUESTS_TIMEOUT)
        assert blocklist == [str(id, "utf-8") for id in file_content]


@pytest.mark.parametrize("url", [None, "http://test.me"])
@pytest.mark.parametrize("platform", ["mitx", "other"])
def test_load_course_duplicates(url, platform, settings, mocker):
    """Test that a list of duplicate course id sets is returned if a URL is set"""
    settings.DUPLICATE_COURSES_URL = url
    file_content = """
---
mitx:
  - duplicate_course_ids:
      - MITx+1
      - MITx+2
      - MITx+3
    course_id: MITx+1
"""

    mock_request = mocker.patch(
        "requests.get", autospec=True, return_value=mocker.Mock(text=file_content)
    )
    duplicates = load_course_duplicates(platform)
    if url is None:
        mock_request.assert_not_called()
        assert duplicates == []
    elif platform == "other":
        mock_request.assert_called_once_with(url, timeout=settings.REQUESTS_TIMEOUT)
        assert duplicates == []
    else:
        mock_request.assert_called_once_with(url, timeout=settings.REQUESTS_TIMEOUT)
        assert duplicates == [
            {
                "duplicate_course_ids": ["MITx+1", "MITx+2", "MITx+3"],
                "course_id": "MITx+1",
            }
        ]


def test_get_ocw_topics():
    """get_ocw_topics should return the expected list of topics"""
    collection = [
        {
            "ocw_feature": "Engineering",
            "ocw_subfeature": "Mechanical Engineering",
            "ocw_speciality": "Dynamics and Control",
        },
        {
            "ocw_feature": "Engineering",
            "ocw_subfeature": "Electrical Engineering",
            "ocw_speciality": "Signal Processing",
        },
    ]

    assert sorted(get_ocw_topics(collection)) == [
        "Dynamics and Control",
        "Electrical Engineering",
        "Engineering",
        "Mechanical Engineering",
        "Signal Processing",
    ]


@pytest.mark.parametrize(
    "course_json,expected_departments",
    [
        ({"department_number": "22"}, ["22"]),
        ({"department_number": "22", "extra_course_number": None}, ["22"]),
        (
            {
                "department_number": "22",
                "extra_course_number": [
                    {"linked_course_number_col": "3.1"},
                    {"linked_course_number_col": "4.1"},
                    {"linked_course_number_col": "4.2"},
                ],
            },
            ["22", "3", "4"],
        ),
    ],
)
def test_get_ocw_department(course_json, expected_departments):
    """test_get_ocw_department should return the expected list of departments"""
    assert get_ocw_department_list(course_json) == expected_departments


def test_safe_load_bad_json(mocker):
    """Test that safe_load_json returns an empty dict for invalid JSON"""
    mock_logger = mocker.patch("course_catalog.utils.log.exception")
    assert safe_load_json("badjson", "key") == {}
    mock_logger.assert_called_with("%s has a corrupted JSON", "key")


def test_parse_instructors(test_instructors_data):
    """Verify that instructors assignment is working as expected"""
    for instructor in test_instructors_data:
        parsed_instructors = parse_instructors([instructor["data"]])
        parsed_instructor = parsed_instructors[0]
        assert parsed_instructor.get("first_name") == instructor["result"]["first_name"]
        assert parsed_instructor.get("last_name") == instructor["result"]["last_name"]
        assert parsed_instructor.get("full_name") == instructor["result"]["full_name"]
