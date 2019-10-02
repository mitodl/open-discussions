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
from course_catalog.factories import CourseFactory, RunFactory
from course_catalog.models import (
    Course,
    LearningResourceRun,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    Bootcamp,
)
from course_catalog.utils import get_ocw_topic
from course_catalog.api import (
    parse_mitx_json_data,
    digest_ocw_course,
    safe_load_json,
    get_course_availability,
    should_skip_course,
    tag_edx_course_program,
    parse_bootcamp_json_data,
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


@pytest.fixture
def ocw_valid_data():
    """
    Test OCW course data
    """
    return {
        "uid": "e9387c256bae4ca99cce88fd8b7f8272",
        "department_number": "2",
        "master_course_number": "101",
        "course_id": "2.101",
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


@pytest.fixture
def bootcamp_valid_data():
    """
    Return valid bootcamp data
    """
    return {
        "course_id": "BootcampTest1",
        "title": "Test Bootcamp",
        "short_description": "The MIT Test Bootcamp",
        "level": None,
        "semester": None,
        "language": None,
        "platform": "Bootcamps",
        "year": 2019,
        "full_description": "<p>The Test Bootcamp is now open.</p>",
        "start_date": "2019-06-15T00:00:01Z",
        "end_date": "2019-06-21T23:59:59Z",
        "enrollment_start": None,
        "enrollment_end": "2019-04-15T23:59:59Z",
        "image_src": "https://bootcamp.mit.edu/wp-content/uploads/2019/01/healthcare-600x231.png",
        "image_description": None,
        "featured": False,
        "published": True,
        "availability": "starting soon",
        "url": "https://bootcamp.mit.edu/entrepreneurship/healthcare-innovation/",
        "last_modified": "2019-05-08T13:18:17.507967Z",
        "program_type": None,
        "program_name": None,
        "location": None,
        "instructors": [],
        "learning_resource_type": "course",
        "topics": [
            {"name": "Business & Management"},
            {"name": "Entrepreneurship"},
            {"name": "Innovation"},
        ],
        "prices": [
            {"price": 8500, "mode": "Early Bird"},
            {"price": 9500, "mode": "Standard"},
        ],
    }


@pytest.mark.parametrize("force_overwrite", [True, False])
def test_parse_mitx_json_data_overwrite_course(
    mocker, mock_course_index_functions, force_overwrite, mitx_valid_data
):
    """
    Test that valid mitx json data for a course is skipped if it doesn't need an update
    """
    course = CourseFactory.create(
        course_id=mitx_valid_data["key"],
        last_modified=datetime.now().astimezone(pytz.utc),
    )
    RunFactory.create(
        content_object=course,
        run_id=mitx_valid_data["runs"][0]["key"],
        last_modified=datetime.now().astimezone(pytz.utc),
    )
    mock_save_course = mocker.patch(
        "course_catalog.api.EDXCourseSerializer.save", return_value=course
    )
    mock_save_run = mocker.patch("course_catalog.api.RunSerializer.save")
    assert course.course_id == mitx_valid_data["key"]
    parse_mitx_json_data(mitx_valid_data, force_overwrite=force_overwrite)
    assert mock_save_course.call_count == (1 if force_overwrite else 0)
    assert mock_save_run.call_count == (1 if force_overwrite else 0)
    assert mock_course_index_functions.upsert_course.call_count == (
        1 if force_overwrite else 0
    )


@pytest.mark.parametrize("force_overwrite", [True, False])
def test_parse_mitx_json_data_overwrite_courserun(
    mocker, mock_course_index_functions, force_overwrite, mitx_valid_data
):
    """
    Test that valid mitx json data for a run is skipped if it doesn't need an update
    """
    course = CourseFactory.create(
        course_id=mitx_valid_data["key"],
        last_modified=datetime(year=2010, month=1, day=1).astimezone(pytz.utc),
    )
    RunFactory.create(
        content_object=course,
        run_id=mitx_valid_data["runs"][0]["key"],
        last_modified=datetime.now().astimezone(pytz.utc),
    )
    mock_save_course = mocker.patch(
        "course_catalog.api.EDXCourseSerializer.save", return_value=course
    )
    mock_save_run = mocker.patch("course_catalog.api.RunSerializer.save")
    assert course.course_id == mitx_valid_data["key"]
    parse_mitx_json_data(mitx_valid_data, force_overwrite=force_overwrite)
    assert mock_save_course.call_count == 1
    assert mock_save_run.call_count == (1 if force_overwrite else 0)
    assert mock_course_index_functions.upsert_course.call_count == 1


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

    mock_course_index_functions.upsert_course.assert_called_once_with(
        Course.objects.first()
    )
    assert Course.objects.first().runs.first().best_start_date == datetime.strptime(
        "2019-02-20T15:00:00Z", "%Y-%m-%dT%H:%M:%SZ"
    ).replace(tzinfo=pytz.UTC)
    assert Course.objects.first().runs.first().best_end_date == datetime.strptime(
        "2019-05-22T23:30:00Z", "%Y-%m-%dT%H:%M:%SZ"
    ).replace(tzinfo=pytz.UTC)


def test_parse_mitx_json_data_no_runs(mitx_valid_data):
    """
    Test that a course without runs is skipped
    """
    mitx_data = copy.copy(mitx_valid_data)
    mitx_data["runs"] = []
    parse_mitx_json_data(mitx_data)
    course_count = Course.objects.count()
    assert course_count == 0


def test_parse_invalid_mitx_json_data(mitx_valid_data):
    """
    Test parsing invalid mitx json data for a course
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["key"] = ""
    parse_mitx_json_data(invalid_data)
    course_count = Course.objects.count()
    assert course_count == 0


def test_parse_mitx_json_data_skip_course_title(mitx_valid_data):
    """
    Test parsing invalid mitx json data for a course
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["title"] = "Delete"
    parse_mitx_json_data(invalid_data)
    course_count = Course.objects.count()
    assert course_count == 0


def test_parse_invalid_mitx_run_data(mitx_valid_data):
    """
    Test parsing invalid mitx json data for a course run
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["runs"][0]["key"] = ""
    parse_mitx_json_data(invalid_data)
    course_count = Course.objects.count()
    assert course_count == 1
    run_count = LearningResourceRun.objects.count()
    assert run_count == 0


def test_parse_mitx_json_data_skip_courserun_title(mitx_valid_data):
    """
    Test parsing invalid mitx json data for a course run
    """
    invalid_data = copy.copy(mitx_valid_data)
    invalid_data["runs"][0]["title"] = "delete"
    parse_mitx_json_data(invalid_data)
    run_count = LearningResourceRun.objects.count()
    assert run_count == 0


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
def test_deserializing_a_valid_ocw_course(ocw_valid_data):
    """
    Verify that OCWSerializer successfully de-serialize a JSON object and create Course model instance
    """
    digest_ocw_course(ocw_valid_data, timezone.now(), None, True)
    assert Course.objects.count() == 1
    digest_ocw_course(ocw_valid_data, timezone.now() - timedelta(hours=1), None, True)
    assert Course.objects.count() == 1

    course = Course.objects.last()
    digest_ocw_course(
        ocw_valid_data, timezone.now() + timedelta(hours=1), course, True, "PROD/RES"
    )
    assert Course.objects.count() == 1
    assert (
        Course.objects.last().learning_resource_type == ResourceType.ocw_resource.value
    )

    course_instructors_count = CourseInstructor.objects.count()
    assert course_instructors_count == len(ocw_valid_data.get("instructors"))

    course_prices_count = CoursePrice.objects.count()
    assert course_prices_count == 1

    course_topics_count = CourseTopic.objects.count()
    assert course_topics_count == sum(
        len(get_ocw_topic(cc)) for cc in ocw_valid_data.get("course_collections")
    )


def test_deserialzing_an_invalid_ocw_course(ocw_valid_data):
    """
    Verifies that OCWSerializer validation works correctly if the OCW course has invalid values
    """
    ocw_valid_data.pop("course_id")
    digest_ocw_course(ocw_valid_data, timezone.now(), None, True)
    assert not Course.objects.count()


def test_deserialzing_an_invalid_ocw_course_run(ocw_valid_data):
    """
    Verifies that RunSerializer validation works correctly if the OCW course run serializer is invalid
    """
    ocw_valid_data.pop("uid")
    digest_ocw_course(ocw_valid_data, timezone.now(), None, True)
    assert not LearningResourceRun.objects.count()


@pytest.mark.usefixtures("mock_index_functions")
def test_deserializing_a_valid_bootcamp(bootcamp_valid_data):
    """
    Verify that parse_bootcamp_json_data successfully creates a Bootcamp model instance
    """
    parse_bootcamp_json_data(bootcamp_valid_data)
    assert Bootcamp.objects.count() == 1
    assert LearningResourceRun.objects.count() == 1


@pytest.mark.usefixtures("mock_index_functions")
def test_deserializing_an_invalid_bootcamp_run(bootcamp_valid_data, mocker):
    """
    Verifies that parse_bootcamp_json_data does not create a new Bootcamp run if the serializer is invalid
    """
    mocker.patch("course_catalog.api.RunSerializer.is_valid", return_value=False)
    mocker.patch(
        "course_catalog.api.RunSerializer.errors", return_value={"error": "Bad data"}
    )
    parse_bootcamp_json_data(bootcamp_valid_data)
    assert LearningResourceRun.objects.count() == 0


def test_deserialzing_an_invalid_bootcamp(bootcamp_valid_data):
    """
    Verifies that parse_bootcamp_json_data does not create a new Bootcamp if the serializer is invalid
    """
    bootcamp_valid_data.pop("course_id")
    parse_bootcamp_json_data(bootcamp_valid_data)
    assert Bootcamp.objects.count() == 0
    assert LearningResourceRun.objects.count() == 0


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
        course_id=mitx_valid_data["runs"][0]["key"],
        raw_json=mitx_valid_data,
        platform=PlatformType.mitx.value,
    )
    # test mitx course without raw_json
    assert (
        get_course_availability(mitx_course_with_json)
        == mitx_valid_data["runs"][0]["availability"]
    )
    mitx_course_no_json = CourseFactory.create(
        raw_json=None, platform=PlatformType.mitx.value
    )
    assert get_course_availability(mitx_course_no_json) is None
    # test mitx course without course_runs
    mitx_valid_data["runs"] = None  # pop course_runs json
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
