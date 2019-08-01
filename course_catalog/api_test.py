"""
Test course_catalog.api
"""
import copy
import json
from datetime import timedelta, datetime

import pytest
import pytz
from django.utils import timezone

from course_catalog.constants import PlatformType, AvailabilityType, ResourceType
from course_catalog.factories import CourseFactory, CourseRunFactory
from course_catalog.models import Course, CourseInstructor, CoursePrice, CourseTopic
from course_catalog.utils import get_ocw_topic
from course_catalog.api import (
    parse_mitx_json_data,
    digest_ocw_course,
    safe_load_json,
    get_course_availability,
    should_skip_course,
    tag_edx_course_program,
)

pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name,unused-argument


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
    course = CourseFactory.create(
        course_id=mitx_valid_data["key"],
        last_modified=datetime.now().astimezone(pytz.utc),
    )
    CourseRunFactory.create(course=course, course_run_id=mitx_valid_data["course_runs"][0]["key"])
    mock_save_course = mocker.patch("course_catalog.api.EDXCourseRunSerializer.save")
    mock_save_run = mocker.patch("course_catalog.api.EDXCourseSerializer.save")
    parse_mitx_json_data(mitx_valid_data, force_overwrite=force_overwrite)
    assert mock_save_course.call_count == (1 if force_overwrite else 0)
    assert mock_save_run.call_count == (1 if force_overwrite else 0)
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

    mock_course_index_functions.index_new_course.assert_called_once_with(
        Course.objects.first()
    )


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

    course = Course.objects.last()
    digest_ocw_course(
        valid_ocw_obj, timezone.now() + timedelta(hours=1), course, True, "PROD/RES"
    )
    assert Course.objects.count() == 1
    assert (
        Course.objects.last().learning_resource_type == ResourceType.ocw_resource.value
    )

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
    mock_logger = mocker.patch("course_catalog.api.log.exception")
    assert safe_load_json("badjson", "key") == {}
    mock_logger.assert_called_with("%s has a corrupted JSON", "key")


def test_get_course_availability(mitx_valid_data):
    """ Test that availability is calculated as expected """
    ocw_course = CourseFactory.create(platform=PlatformType.ocw.value)
    # test mitx course with raw_json
    assert get_course_availability(ocw_course) == AvailabilityType.current.value
    mitx_course_with_json = CourseFactory.create(
        course_id=mitx_valid_data["course_runs"][0]["key"],
        raw_json=mitx_valid_data,
        platform=PlatformType.mitx.value,
    )
    # test mitx course without raw_json
    assert (
        get_course_availability(mitx_course_with_json)
        == mitx_valid_data["course_runs"][0]["availability"]
    )
    mitx_course_no_json = CourseFactory.create(
        raw_json=None, platform=PlatformType.mitx.value
    )
    assert get_course_availability(mitx_course_no_json) is None
    # test mitx course without course_runs
    mitx_valid_data["course_runs"] = None  # pop course_runs json
    mitx_course_no_runs_json = CourseFactory.create(
        raw_json=mitx_valid_data, platform=PlatformType.mitx.value
    )
    assert get_course_availability(mitx_course_no_runs_json) is None


def test_should_skip_course():
    """ Tests should_skip_course returns as expected """
    assert should_skip_course("DELETE")
    assert should_skip_course("Delete")
    assert should_skip_course("Delete ")
    assert should_skip_course("Delete wrong institution")
    assert should_skip_course("[DELETE]Management in Engineering II]")
    assert should_skip_course("Introduction to Syntax") is False


def test_tag_edx_course_program(get_micromasters_data):
    """ Tests that edx courses are tagged with programs """
    course_pro = CourseFactory.create(
        platform=PlatformType.mitx.value,
        course_id="course-v1:MITProfessionalX+SysEngx4+1T2017",
    )
    course_micro = CourseFactory.create(
        platform=PlatformType.mitx.value, course_id="course-v1:MITx+ESD.SCM1x+3T2014"
    )
    course_blank_pro = CourseFactory.create(
        platform=PlatformType.mitx.value,
        course_id="course-v1:MITProfessionalX+Something+1T2017",
    )
    course_none = CourseFactory.create(
        platform=PlatformType.mitx.value, course_id="MyTestCourse"
    )
    course_ocw = CourseFactory.create(
        platform=PlatformType.ocw.value, course_id="abc123"
    )
    tag_edx_course_program()

    course_pro.refresh_from_db()
    assert course_pro.program_type == "Professional"
    assert (
        course_pro.program_name
        == "Architecture and Systems Engineering: Models and Methods to Manage Complex Systems"
    )

    course_micro.refresh_from_db()
    assert course_micro.program_type == "MicroMasters"
    assert course_micro.program_name == "Supply Chain Management"

    course_blank_pro.refresh_from_db()
    assert course_blank_pro.program_type == "Professional"
    assert course_blank_pro.program_name is None

    course_none.refresh_from_db()
    assert course_none.program_type is None
    assert course_none.program_name is None

    course_ocw.refresh_from_db()
    assert course_ocw.program_type is None
    assert course_ocw.program_name is None
