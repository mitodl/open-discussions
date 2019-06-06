"""
Test course_catalog serializer_helpers
"""
import pytest

from course_catalog.constants import PlatformType
from course_catalog.serializer_helpers import get_course_url


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
    """ Test that url's are calculated as expected """
    actual_url = get_course_url(course_id, course_json, platform)
    if expected is None:
        assert actual_url is expected
    else:
        assert actual_url == expected
