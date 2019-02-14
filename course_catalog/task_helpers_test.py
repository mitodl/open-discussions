"""
Test course_catalog task_helpers
"""
import copy
import json
from datetime import timedelta, datetime

import pytest
import pytz
from django.utils import timezone

from course_catalog.constants import PlatformType
from course_catalog.factories import CourseFactory
from course_catalog.models import Course, CourseInstructor, CoursePrice, CourseTopic
from course_catalog.task_helpers import (
    parse_mitx_json_data,
    digest_ocw_course,
    get_ocw_topic,
    safe_load_json,
    get_course_url,
)

pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name


@pytest.fixture
def mitx_valid_data():
    """
    Test MITx course data
    """
    with open("./test_json/test_mitx_course02.json", "r") as test_data:
        return json.load(test_data)


@pytest.mark.parametrize("force_overwrite", [True, False])
def test_parse_mitx_json_data_overwrite(
    mocker, mock_course_index_functions, force_overwrite, mitx_valid_data
):
    """
    Test that valid mitx json data is skipped if it doesn't need an update
    """
    CourseFactory.create(
        course_id=mitx_valid_data["course_runs"][0]["key"],
        last_modified=datetime.now().astimezone(pytz.utc),
    )
    mock_save = mocker.patch("course_catalog.task_helpers.CourseSerializer.save")
    parse_mitx_json_data(mitx_valid_data, force_overwrite=force_overwrite)
    assert mock_save.call_count == (1 if force_overwrite else 0)
    assert mock_course_index_functions.update_course.call_count == (
        1 if force_overwrite else 0
    )


def test_parse_valid_mitx_json_data(mock_course_index_functions, mitx_valid_data):
    """
    Test parsing valid mitx json data
    """
    parse_mitx_json_data(mitx_valid_data)
    courses_count = Course.objects.count()
    assert courses_count == 1

    course_instructors_count = CourseInstructor.objects.count()
    assert course_instructors_count == 2

    course_prices_count = CoursePrice.objects.count()
    assert course_prices_count == 2

    course_topics_count = CourseTopic.objects.count()
    assert course_topics_count == 1

    course = Course.objects.first()

    mock_course_index_functions.index_new_course.assert_called_once_with(course)


def test_parse_invalid_mitx_json_data(mitx_valid_data):
    """
    Test parsing invalid mitx json data
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["course_runs"][0]["key"] = ""
    parse_mitx_json_data(invalid_data)
    courses_count = Course.objects.count()
    assert courses_count == 0


def test_parse_wrong_owner_json_data(mitx_valid_data):
    """
    Test parsing valid edx data from a different owner.
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["owners"][0]["key"] = "FakeUniversity"
    parse_mitx_json_data(invalid_data)
    courses_count = Course.objects.count()
    assert courses_count == 0


@pytest.mark.usefixtures("mock_index_functions")
def test_deserializing_a_valid_ocw_course():
    """
    Verify that OCWSerializer successfully de-serialize a JSON object and create Course model instance
    """
    valid_ocw_obj = {
        "uid": "e9387c256bae4ca99cce88fd8b7f8272",
        "title": "Undergraduate Thesis Tutorial",
        "description": "<p>This course is a series of lectures on prospectus and thesis writing</p>",
        "course_level": "Undergraduate",
        "from_semester": "Fall",
        "from_year": "2015",
        "language": "en-US",
        "image_src": "https://s3.us-east-2.amazonaws.com/alizagarantestbucket/test_folder/"
        "f49d46243a5c035597e75941ffec830a_22-thtf15.jpg",
        "image_description": "Photo of hardbound academic theses on library shelves.",
        "platform": "OCW",
        "creation_date": "2016-01-08 22:35:55.151996+00:00",
        "expiration_date": None,
        "raw_json": {"name": "ali", "whatever": "something", "llist": [1, 2, 3]},
        "instructors": [
            {
                "middle_initial": "",
                "first_name": "Michael",
                "last_name": "Short",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "d9ca5631c6936252866d63683c0c452e",
            },
            {
                "middle_initial": "",
                "first_name": "Jane",
                "last_name": "Kokernak",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "bb1e26b5f5c9c054ddae8a2988ad7b42",
            },
            {
                "middle_initial": "",
                "first_name": "Christine",
                "last_name": "Sherratt",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "a39f692061a70a105c25b15374c02c92",
            },
        ],
        "course_collections": [
            {
                "ocw_feature": "Engineering",
                "ocw_subfeature": "Nuclear Engineering",
                "ocw_feature_url": "",
                "ocw_speciality": "Health and Exercise Science",
                "ocw_feature_notes": "",
            },
            {
                "ocw_feature": "Humanities",
                "ocw_subfeature": "Literature",
                "ocw_feature_url": "",
                "ocw_speciality": "Academic Writing",
                "ocw_feature_notes": "",
            },
        ],
        "price": {"price": 0.0, "mode": "audit", "upgrade_deadline": None},
    }
    digest_ocw_course(valid_ocw_obj, timezone.now(), None, True)
    assert Course.objects.count() == 1
    digest_ocw_course(valid_ocw_obj, timezone.now() - timedelta(hours=1), None, True)
    assert Course.objects.count() == 1

    course_instructors_count = CourseInstructor.objects.count()
    assert course_instructors_count == len(valid_ocw_obj.get("instructors"))

    course_prices_count = CoursePrice.objects.count()
    assert course_prices_count == 1

    course_topics_count = CourseTopic.objects.count()
    assert course_topics_count == sum(
        len(get_ocw_topic(cc)) for cc in valid_ocw_obj.get("course_collections")
    )


def test_deserialzing_an_invalid_ocw_course():
    """
    Verifies that OCWSerializer validation works correctly if the OCW course has invalid values
    """
    invalid_ocw_obj = {
        "uid": "",
        "title": "",
        "description": "",
        "course_level": "",
        "from_semester": "Fall",
        "from_year": "2015",
        "language": "en-US",
        "image_src": "",
        "image_description": "Photo of hardbound academic theses on library shelves.",
        "platform": "OCW",
        "creation_date": "2016/01/08 22:35:55.151996+00:00",
        "expiration_date": None,
        "raw_json": {},
        "instructors": [
            {
                "middle_initial": "",
                "first_name": "Michael",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "d9ca5631c6936252866d63683c0c453e",
            },
            {
                "middle_initial": "",
                "first_name": "Jane",
                "last_name": "Kokernak",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "bb1e26b5f5c9c054ddae8a2988ad7b48",
            },
            {
                "middle_initial": "",
                "last_name": "Sherratt",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "a39f692061a70a105c25b15374c02c95",
            },
        ],
        "course_collections": [
            {
                "ocw_feature": "Engineering",
                "ocw_subfeature": "Nuclear Engineering",
                "ocw_feature_url": "",
                "ocw_speciality": "",
                "ocw_feature_notes": "",
            },
            {
                "ocw_feature": "Humanities",
                "ocw_subfeature": "Literature",
                "ocw_feature_url": "",
                "ocw_speciality": "Academic Writing",
                "ocw_feature_notes": "",
            },
        ],
        "price": {"price": 0.0, "upgrade_deadline": None},
    }
    digest_ocw_course(invalid_ocw_obj, timezone.now(), None, True)
    assert not Course.objects.count()


def test_safe_load_bad_json(mocker):
    """ Test that safe_load_json returns an empty dict for invalid JSON"""
    mock_logger = mocker.patch("course_catalog.task_helpers.log.exception")
    assert safe_load_json("badjson", "key") == {}
    mock_logger.assert_called_with("%s has a corrupted JSON", "key")


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
