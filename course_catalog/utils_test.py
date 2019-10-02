"""
Test course_catalog utils
"""
from datetime import datetime

import pytest
import pytz

from course_catalog.constants import PlatformType
from course_catalog.utils import get_course_url, semester_year_to_date


@pytest.mark.parametrize(
    "course_id,course_json,platform, expected",
    [
        [
            "MITX-01",
            {"runs": [{"marketing_url": "https://www.edx.org/course/someurl"}]},
            PlatformType.mitx.value,
            "https://www.edx.org/course/someurl",
        ],
        [
            "MITX-01",
            {"runs": [{"marketing_url": "https://www.edx.org/"}]},
            PlatformType.mitx.value,
            "https://courses.edx.org/courses/MITX-01/course/",
        ],
        [
            "MITX-01",
            {"runs": [{"marketing_url": ""}]},
            PlatformType.mitx.value,
            "https://courses.edx.org/courses/MITX-01/course/",
        ],
        [
            "MITX-01",
            {"runs": [{}]},
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
    """ Test that url's are calculated as expected """
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
    ],
)
def test_semester_year_to_date(semester, year, ending, expected):
    """
    Test that a correct rough date is returned for semester and year
    """
    if expected is None:
        assert semester_year_to_date(semester, year, ending=ending) is None
    else:
        assert semester_year_to_date(
            semester, year, ending=ending
        ) == datetime.strptime(expected, "%Y-%m-%d").replace(tzinfo=pytz.UTC)
