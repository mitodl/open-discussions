"""
Test course_catalog.api
"""
import json
from datetime import datetime, timedelta
from subprocess import CalledProcessError

import boto3
import pytest
import pytz
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from mock import ANY
from moto import mock_s3

from course_catalog.api import (
    digest_ocw_course,
    digest_ocw_next_course,
    format_date,
    generate_course_prefix_list,
    get_course_availability,
    ocw_parent_folder,
    parse_bootcamp_json_data,
    sync_ocw_course,
    sync_ocw_course_files,
    sync_ocw_next_course,
    sync_ocw_next_courses,
    sync_xpro_course_files,
)
from course_catalog.conftest import (
    OCW_NEXT_TEST_PREFIX,
    TEST_PREFIX,
    setup_s3,
    setup_s3_ocw_next,
)
from course_catalog.constants import (
    AvailabilityType,
    OfferedBy,
    PlatformType,
    ResourceType,
)
from course_catalog.factories import CourseFactory, LearningResourceRunFactory
from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    LearningResourceRun,
)
from course_catalog.utils import get_ocw_topics

pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name,unused-argument


@pytest.fixture
def mitx_valid_data():
    """
    Test MITx course data
    """
    with open("./test_json/test_mitx_course.json", "r") as test_data:
        return json.load(test_data)["results"][0]


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
                "salutation": "Dr.",
            },
            {
                "middle_initial": "",
                "last_name": "Kokernak",
                "suffix": "",
                "title": "",
                "mit_id": "",
                "department": "",
                "directory_title": "",
                "uid": "bb1e26b5f5c9c054ddae8a2988ad7b42",
                "salutation": "Prof.",
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
        "extra_course_number": [
            {"linked_course_number_col": "3.1"},
            {"linked_course_number_col": "4.1"},
        ],
    }


@pytest.fixture
def ocw_next_valid_data():
    """
    Return valid bootcamp data
    """
    return {
        "course_title": "Unified Engineering I, II, III, \u0026 IV",
        "course_description": "The basic objective of Unified Engineering is to give a solid understanding of the fundamental disciplines of aerospace engineering, as well as their interrelationships and applications. These disciplines are Materials and Structures (M); Computers and Programming (C); Fluid Mechanics (F); Thermodynamics (T); Propulsion (P); and Signals and Systems (S). In choosing to teach these subjects in a unified manner, the instructors seek to explain the common intellectual threads in these disciplines, as well as their combined application to solve engineering Systems Problems (SP). Throughout the year, the instructors emphasize the connections among the disciplines",
        "site_uid": None,
        "legacy_uid": "97db384e-f340-09a6-4df7-cb86cf701979",
        "instructors": [
            {
                "first_name": "Mark",
                "last_name": "Drela",
                "middle_initial": "",
                "salutation": "Prof.",
                "title": "Prof. Mark Drela",
            },
            {
                "first_name": "Steven",
                "last_name": "Hall",
                "middle_initial": "",
                "salutation": "Prof.",
                "title": "Prof. Steven Hall",
            },
        ],
        "department_numbers": ["16"],
        "learning_resource_types": [
            "Lecture Videos",
            "Course Introduction",
            "Competition Videos",
            "Problem Sets with Solutions",
            "Exams with Solutions",
        ],
        "topics": [
            ["Engineering", "Aerospace Engineering", "Materials Selection"],
            ["Engineering", "Aerospace Engineering", "Propulsion Systems"],
            ["Science", "Physics", "Thermodynamics"],
            ["Engineering", "Mechanical Engineering", "Fluid Mechanics"],
            ["Engineering", "Aerospace Engineering"],
            ["Business", "Project Management"],
        ],
        "primary_course_number": "16.01",
        "extra_course_numbers": "16.02, 16.03, 16.04",
        "term": "Fall",
        "year": "2005",
        "level": ["Undergraduate"],
        "image_src": "https://open-learning-course-data-production.s3.amazonaws.com/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/8f56bbb35d0e456dc8b70911bec7cd0d_16-01f05.jpg",
        "course_image_metadata": {
            "description": "An abstracted aircraft wing with illustrated systems. (Image by MIT OCW.)",
            "draft": False,
            "file": "https://open-learning-course-data-production.s3.amazonaws.com/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/8f56bbb35d0e456dc8b70911bec7cd0d_16-01f05.jpg",
            "file_type": "image/jpeg",
            "image_metadata": {
                "caption": "An abstracted aircraft wing, illustrating the connections between the disciplines of Unified Engineering. (Image by MIT OpenCourseWare.)",
                "credit": "",
                "image-alt": "Illustration of an aircraft wing showing connections between the disciplines of the course.",
            },
            "iscjklanguage": False,
            "resourcetype": "Image",
            "title": "16-01f05.jpg",
            "uid": "8f56bbb3-5d0e-456d-c8b7-0911bec7cd0d",
        },
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


@pytest.mark.parametrize("published", [True, False])
def test_deserializing_a_valid_ocw_course(
    mock_course_index_functions, ocw_valid_data, published
):
    """
    Verify that OCWSerializer successfully de-serialize a JSON object and create Course model instance
    """
    digest_ocw_course(ocw_valid_data, timezone.now(), published)
    assert Course.objects.count() == 1
    digest_ocw_course(ocw_valid_data, timezone.now() - timedelta(hours=1), published)
    assert Course.objects.count() == 1

    digest_ocw_course(
        ocw_valid_data, timezone.now() + timedelta(hours=1), published, "PROD/RES"
    )
    assert Course.objects.count() == 1
    course = Course.objects.last()

    if published:
        assert course.learning_resource_type == ResourceType.ocw_resource.value

    assert course.title == ocw_valid_data["title"]
    assert course.department == ["2", "3", "4"]
    assert course.extra_course_numbers == ["3.1", "4.1"]
    assert course.offered_by.count() == 1
    assert course.offered_by.first().name == OfferedBy.ocw.value
    assert course.runs.first().offered_by.count() == 1
    assert course.runs.first().offered_by.first().name == OfferedBy.ocw.value

    course_instructors = CourseInstructor.objects.order_by("last_name").all()
    assert len(course_instructors) == 3

    expected_course_instructor_values = [
        {"first_name": None, "last_name": "Kokernak", "full_name": "Prof. Kokernak"},
        {
            "first_name": "Christine",
            "last_name": "Sherratt",
            "full_name": "Christine Sherratt",
        },
        {
            "first_name": "Michael",
            "last_name": "Short",
            "full_name": "Dr. Michael Short",
        },
    ]

    for instructor, expected_values in zip(
        course_instructors, expected_course_instructor_values
    ):
        assert instructor.first_name == expected_values["first_name"]
        assert instructor.last_name == expected_values["last_name"]
        assert instructor.full_name == expected_values["full_name"]

    course_prices_count = CoursePrice.objects.count()
    assert course_prices_count == 1

    course_topics_count = CourseTopic.objects.count()
    assert course_topics_count == len(
        get_ocw_topics(ocw_valid_data.get("course_collections"))
    )
    assert not course.ocw_next_course


def test_deserializing_a_valid_ocw_course_with_existing_newer_run(
    mock_course_index_functions, ocw_valid_data
):
    """
    Verify that course values are not overwritten if the course already has a newer run
    """
    course = CourseFactory.create(
        platform=PlatformType.ocw.value,
        course_id=f'{ocw_valid_data["uid"]}+{ocw_valid_data["course_id"]}',
        title="existing",
    )

    assert course.runs.count() == 3
    existing_run = course.runs.first()
    existing_run.best_start_date = datetime.now(timezone.utc)
    existing_run.save()

    digest_ocw_course(ocw_valid_data, timezone.now(), True)
    assert Course.objects.count() == 1
    course = Course.objects.last()
    assert course.title == "Undergraduate Thesis Tutorial"
    assert course.runs.count() == 4


def test_deserializing_a_valid_ocw_course_with_keep_existing_image_src(
    mock_course_index_functions, ocw_valid_data
):
    """
    Verify that image_src is not overwritten if keep_existing_image_src=True
    """
    course = CourseFactory.create(
        platform=PlatformType.ocw.value,
        course_id=f'{ocw_valid_data["uid"]}+{ocw_valid_data["course_id"]}',
        image_src="existing",
    )

    assert Course.objects.last().image_src == "existing"

    digest_ocw_course(ocw_valid_data, timezone.now(), True, "PROD/RES", True)
    assert Course.objects.count() == 1
    course = Course.objects.last()
    assert course.image_src == "existing"


def test_deserialzing_an_invalid_ocw_course(ocw_valid_data):
    """
    Verifies that OCWSerializer validation works correctly if the OCW course has invalid values
    """
    ocw_valid_data.pop("course_id")
    digest_ocw_course(ocw_valid_data, timezone.now(), True)
    assert not Course.objects.count()


def test_deserialzing_an_invalid_ocw_course_run(ocw_valid_data, mocker):
    """
    Verifies that LearningResourceRunSerializer validation works correctly if the OCW course run serializer is invalid
    """
    mock_log = mocker.patch("course_catalog.api.log.error")
    ocw_valid_data["enrollment_start"] = "This is not a date"
    digest_ocw_course(ocw_valid_data, timezone.now(), True)
    assert LearningResourceRun.objects.count() == 0
    mock_log.assert_called_once_with(
        "OCW LearningResourceRun %s is not valid: %s", ocw_valid_data.get("uid"), ANY
    )


def test_deserializing_a_valid_ocw_next_course(
    mock_course_index_functions, ocw_next_valid_data
):
    """
    Verify that OCWNextSerializer successfully de-serialize a JSON object and create Course model instance
    """

    uid = "e9387c256bae4ca99cce88fd8b7f8272"
    course_prefix = "courses/my-course"
    digest_ocw_next_course(ocw_next_valid_data, timezone.now(), uid, course_prefix)
    assert Course.objects.count() == 1
    digest_ocw_next_course(
        ocw_next_valid_data, timezone.now() - timedelta(hours=1), uid, course_prefix
    )
    assert Course.objects.count() == 1

    course = Course.objects.last()

    assert course.title == ocw_next_valid_data["course_title"]
    assert course.course_id == f"{uid}+{ocw_next_valid_data['primary_course_number']}"
    assert course.short_description == ocw_next_valid_data["course_description"]
    assert course.image_src == ocw_next_valid_data["image_src"]
    assert (
        course.image_description
        == ocw_next_valid_data["course_image_metadata"]["description"]
    )
    assert course.department == ["16"]
    assert course.extra_course_numbers == ["16.02", "16.03", "16.04"]
    assert course.offered_by.count() == 1
    assert course.offered_by.first().name == OfferedBy.ocw.value
    assert course.runs.first().offered_by.count() == 1
    assert course.runs.first().offered_by.first().name == OfferedBy.ocw.value

    course_instructors = CourseInstructor.objects.order_by("last_name").all()
    assert len(course_instructors) == 2

    expected_course_instructor_values = [
        {"first_name": "Mark", "last_name": "Drela", "full_name": "Prof. Mark Drela"},
        {"first_name": "Steven", "last_name": "Hall", "full_name": "Prof. Steven Hall"},
    ]

    for instructor, expected_values in zip(
        course_instructors, expected_course_instructor_values
    ):
        assert instructor.first_name == expected_values["first_name"]
        assert instructor.last_name == expected_values["last_name"]
        assert instructor.full_name == expected_values["full_name"]

    assert CoursePrice.objects.count() == 1

    assert CourseTopic.objects.count() == 11
    assert course.ocw_next_course
    assert course.runs.first().slug == "my-course"


def test_deserialzing_an_invalid_ocw_next_course(ocw_next_valid_data):
    """
    Verifies that OCWNextSerializer validation works correctly if the OCW course has invalid values
    """
    uid = "e9387c256bae4ca99cce88fd8b7f8272"
    course_prefix = "courses/my-course"

    ocw_next_valid_data.pop("primary_course_number")
    digest_ocw_next_course(ocw_next_valid_data, timezone.now(), uid, course_prefix)
    assert not Course.objects.count()


def test_deserializing_a_valid_bootcamp(bootcamp_valid_data):
    """
    Verify that parse_bootcamp_json_data successfully creates a Bootcamp model instance
    """
    parse_bootcamp_json_data(bootcamp_valid_data)
    bootcamp = Course.objects.filter(platform=PlatformType.bootcamps.value).first()
    assert bootcamp.offered_by.count() == 1
    assert bootcamp.offered_by.first().name == OfferedBy.bootcamps.value
    assert bootcamp.runs.count() == 1
    assert bootcamp.runs.first().offered_by.count() == 1
    assert bootcamp.runs.first().offered_by.first().name == OfferedBy.bootcamps.value


def test_deserializing_an_invalid_bootcamp_run(bootcamp_valid_data, mocker):
    """
    Verifies that parse_bootcamp_json_data does not create a new Course run if the serializer is invalid
    """
    mocker.patch(
        "course_catalog.api.LearningResourceRunSerializer.is_valid", return_value=False
    )
    mocker.patch(
        "course_catalog.api.LearningResourceRunSerializer.errors",
        return_value={"error": "Bad data"},
    )
    parse_bootcamp_json_data(bootcamp_valid_data)
    assert LearningResourceRun.objects.count() == 0


def test_deserialzing_an_invalid_bootcamp(bootcamp_valid_data):
    """
    Verifies that parse_bootcamp_json_data does not create a new Course if the serializer is invalid
    """
    bootcamp_valid_data.pop("course_id")
    parse_bootcamp_json_data(bootcamp_valid_data)
    assert Course.objects.count() == 0
    assert LearningResourceRun.objects.count() == 0


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


@pytest.mark.parametrize("with_error", [True, False])
def test_sync_ocw_course_files(mock_ocw_learning_bucket, mocker, with_error):
    """Test that sync_ocw_course_files calls load_content_files for each run"""
    fake_data = '{"key": "data"}'
    mock_log = mocker.patch("course_catalog.api.log.exception")
    mock_transform = mocker.patch(
        "course_catalog.api.transform_content_files", return_value=fake_data
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, return_value=[]
    )
    if with_error:
        mock_load_content_files.side_effect = Exception
    course = CourseFactory.create(published=True, platform=PlatformType.ocw.value)
    runs = course.runs.all()
    for run in runs:
        mock_ocw_learning_bucket.bucket.put_object(
            Key=f"{run.slug}/{run.slug}_parsed.json", Body=fake_data, ACL="public-read"
        )
    sync_ocw_course_files(ids=[course.id])
    assert mock_load_content_files.call_count == len(runs)
    for run in runs:
        mock_load_content_files.assert_any_call(run, mock_transform.return_value)
        if with_error:
            mock_log.assert_any_call("Error syncing files for course run %d", run.id)


def test_sync_xpro_course_files_empty(mock_xpro_learning_bucket, mocker):
    """a tarball which doesn't contain other course tarballs should be skipped"""

    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/exported_courses_123.tar.gz",
        Body=open("test_json/empty.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, return_value=[]
    )
    sync_xpro_course_files(ids=[123])
    mock_load_content_files.assert_not_called()


def test_sync_xpro_course_files_invalid_tarfile(mock_xpro_learning_bucket, mocker):
    """an invalid tarball should be skipped"""

    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/exported_courses_123.tar.gz",
        Body=b"".join([b"x" for _ in range(100)]),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, return_value=[]
    )
    mocker.patch("course_catalog.api.check_call", side_effect=CalledProcessError(0, ""))
    mock_log = mocker.patch("course_catalog.api.log.exception")
    sync_xpro_course_files(ids=[123])
    mock_load_content_files.assert_not_called()
    assert mock_log.call_args[0][0].startswith("Unable to untar ") is True


def test_sync_xpro_course_files_empty_bucket(mock_xpro_learning_bucket, mocker):
    """If the bucket has no tarballs, it should be skipped"""
    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/not.a.tarball",
        Body=open("test_json/exported_courses_12345.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, return_value=[]
    )
    sync_xpro_course_files(ids=[123])
    mock_load_content_files.assert_not_called()


def test_sync_xpro_course_files_no_runs(mock_xpro_learning_bucket, mocker):
    """If there are no matching runs for the given courses, it should be skipped"""
    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/exported_courses_123.tar.gz",
        Body=open("test_json/exported_courses_12345.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, return_value=[]
    )
    mock_log = mocker.patch("course_catalog.api.log.info")
    sync_xpro_course_files(ids=[123])
    mock_load_content_files.assert_not_called()
    assert mock_log.call_args[0][0].startswith(
        "No xPRO courses matched course tarfile "
    )


def test_sync_xpro_course_files_no_courses(mock_xpro_learning_bucket, mocker):
    """If there are no matching runs for the given courses, it should be skipped"""
    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/exported_courses_123.tar.gz",
        Body=open("test_json/exported_courses_12345.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, return_value=[]
    )
    course_content_type = ContentType.objects.get_for_model(Course)
    LearningResourceRunFactory.create(
        platform=PlatformType.xpro.value,
        run_id="content-devops-0001",
        content_type=course_content_type,
    )
    sync_xpro_course_files(ids=[])
    mock_load_content_files.assert_not_called()


def test_sync_xpro_course_files_error(mock_xpro_learning_bucket, mocker):
    """Exceptions raised during sync_xpro_course_files should be logged"""
    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/exported_courses_123.tar.gz",
        Body=open("test_json/exported_courses_12345.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, side_effect=Exception
    )
    course_content_type = ContentType.objects.get_for_model(Course)
    run = LearningResourceRunFactory.create(
        platform=PlatformType.xpro.value,
        run_id="content-devops-0001",
        content_type=course_content_type,
    )
    course_id = run.object_id
    fake_data = '{"key": "data"}'
    mock_log = mocker.patch("course_catalog.api.log.exception")
    mock_transform = mocker.patch(
        "course_catalog.api.transform_content_files_xpro", return_value=fake_data
    )
    sync_xpro_course_files(ids=[course_id])
    assert mock_transform.call_count == 1
    assert mock_transform.call_args[0][0].endswith("content-devops-0001.tar.gz") is True
    mock_load_content_files.assert_called_once_with(run, fake_data)
    assert mock_log.call_args[0][0].startswith("Error ingesting OLX content data for ")


def test_sync_xpro_course_files(mock_xpro_learning_bucket, mocker):
    """sync xpro courses from a tarball stored in S3"""
    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/exported_courses_123.tar.gz",
        Body=open("test_json/exported_courses_12345.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.api.load_content_files", autospec=True, return_value=[]
    )
    course_content_type = ContentType.objects.get_for_model(Course)
    run = LearningResourceRunFactory.create(
        platform=PlatformType.xpro.value,
        run_id="content-devops-0001",
        content_type=course_content_type,
    )
    course_id = run.object_id
    fake_data = '{"key": "data"}'
    mock_log = mocker.patch("course_catalog.api.log.exception")
    mock_transform = mocker.patch(
        "course_catalog.api.transform_content_files_xpro", return_value=fake_data
    )
    sync_xpro_course_files(ids=[course_id])
    assert mock_transform.call_count == 1
    assert mock_transform.call_args[0][0].endswith("content-devops-0001.tar.gz") is True
    mock_load_content_files.assert_called_once_with(run, fake_data)
    mock_log.assert_not_called()


@pytest.mark.parametrize(
    "prefix, expected",
    [
        ["QA/15-872-system-dynamics-ii-fall-2013/", "QA"],
        [
            "PROD/15-872-system-dynamics-ii-fall-2013/",
            "PROD/15-872-system-dynamics-ii-fall-2013",
        ],
    ],
)
def test_ocw_parent_folder(prefix, expected):
    """ Test that ocw_parent_folder returns expected result for QA and PROD prefixes"""
    assert ocw_parent_folder(prefix) == expected


@pytest.mark.parametrize(
    "prefix, skip",
    [
        ["PROD/biology", True],
        ["PROD/biology-seminar", False],
        ["QA/biology-seminar", True],
    ],
)
def test_sync_ocw_course_skip(mocker, prefix, skip):
    """Sync_ocw_course should not process non-course prefixes"""
    mock_log = mocker.patch("course_catalog.api.log.info")
    mock_bucket = mocker.Mock(objects=mocker.Mock(filter=mocker.Mock(return_value=[])))
    sync_ocw_course(
        course_prefix=prefix,
        raw_data_bucket=mock_bucket,
        force_overwrite=True,
        upload_to_s3=True,
        blocklist=[],
    )
    if skip:
        mock_log.assert_called_once_with("Non-course folder, skipping: %s ...", prefix)
    else:
        mock_log.assert_any_call("Syncing: %s ...", prefix)


@mock_s3
@pytest.mark.parametrize("blocklisted", [True, False])
@pytest.mark.parametrize(
    "pub_date, unpub_date, published",
    [
        ["2020-12-01 00:00:00 US/Eastern", "2020-12-02 00:00:00 US/Eastern", False],
        ["2020-12-02 00:00:00 US/Eastern", "2020-12-01 00:00:00 US/Eastern", True],
        [None, None, False],
        ["", "", False],
        ["2020-12-01 00:00:00 US/Eastern", None, True],
        [None, "2020-12-02 00:00:00 US/Eastern", False],
    ],  # pylint:disable=too-many-arguments
)
def test_sync_ocw_course_published(
    settings, mocker, pub_date, unpub_date, published, blocklisted
):
    """ The course should be published or not based on dates, and always uploaded """
    mocker.patch("course_catalog.etl.ocw.extract_text_metadata", return_value="")
    mocker.patch(
        "course_catalog.api.format_date",
        side_effect=[format_date(pub_date), format_date(unpub_date)],
    )
    mock_upload_course = mocker.patch(
        "course_catalog.api.OCWParser.upload_all_media_to_s3"
    )
    mock_upload_json = mocker.patch(
        "course_catalog.api.OCWParser.upload_parsed_json_to_s3"
    )
    mock_load_content = mocker.patch("course_catalog.api.load_content_files")
    mock_upsert = mocker.patch("course_catalog.api.upsert_course")
    mock_delete = mocker.patch("course_catalog.api.delete_course")
    setup_s3(settings)
    bucket = boto3.resource("s3").Bucket(settings.OCW_CONTENT_BUCKET_NAME)

    sync_ocw_course(
        course_prefix=TEST_PREFIX,
        raw_data_bucket=bucket,
        force_overwrite=True,
        upload_to_s3=True,
        blocklist=(["9.15"] if blocklisted else []),
    )

    assert Course.objects.first().published is (published and not blocklisted)
    if published and not blocklisted:
        mock_upload_course.assert_called_once_with(upload_parsed_json=True)
        mock_load_content.assert_called_once()
        mock_upsert.assert_called_once()
    elif blocklisted or not published:
        mock_delete.assert_called_once()
        mock_upload_json.assert_called_once()


@mock_s3
@pytest.mark.parametrize("overwrite", [True, False])
@pytest.mark.parametrize("ocw_next_course", [True, False])
@pytest.mark.parametrize(
    "start_timestamp",
    [
        None,
        datetime(2020, 11, 15, tzinfo=pytz.utc),
        datetime(2020, 12, 15, tzinfo=pytz.utc),
    ],
)
def test_sync_ocw_course_already_synched(
    settings, mocker, overwrite, start_timestamp, ocw_next_course
):
    """ The course should be published or not based on dates, and always uploaded """
    mocker.patch("course_catalog.etl.ocw.extract_text_metadata", return_value="")

    mock_upload_course = mocker.patch(
        "course_catalog.api.OCWParser.upload_all_media_to_s3"
    )
    mocker.patch("course_catalog.api.OCWParser.upload_parsed_json_to_s3")

    mock_load_content = mocker.patch("course_catalog.api.load_content_files")
    mock_upsert = mocker.patch("course_catalog.api.upsert_course")
    setup_s3(settings)
    bucket = boto3.resource("s3").Bucket(settings.OCW_CONTENT_BUCKET_NAME)

    course = CourseFactory.create(
        platform=PlatformType.ocw.value,
        course_id="16197636c270e1ab179fbc9a56c72787+9.15",
        ocw_next_course=ocw_next_course,
    )

    run = course.runs.last()
    # Set last_modified far in the future so it's greater then the last_modified of the objects in the fake s3 bucket
    # which is the current timestamp
    run.platform = PlatformType.ocw.value
    run.last_modified = format_date("2040-12-03 00:00:00 US/Eastern")
    run.run_id = "16197636c270e1ab179fbc9a56c72787"
    run.save()
    course.runs.update(updated_on=datetime(2020, 12, 1, tzinfo=pytz.utc))

    sync_ocw_course(
        course_prefix=TEST_PREFIX,
        raw_data_bucket=bucket,
        force_overwrite=overwrite,
        upload_to_s3=True,
        blocklist=[],
        start_timestamp=start_timestamp,
    )

    if (
        overwrite
        and start_timestamp != datetime(2020, 11, 15, tzinfo=pytz.utc)
        and not ocw_next_course
    ):
        mock_upload_course.assert_called_once_with(upload_parsed_json=True)
        mock_load_content.assert_called_once()
        mock_upsert.assert_called_once()
    else:
        mock_upload_course.assert_not_called()
        mock_load_content.assert_not_called()
        mock_upsert.assert_not_called()


@mock_s3
def test_sync_ocw_next_course(settings, mocker):
    """ Sync ocw next course """
    mock_upsert = mocker.patch("course_catalog.api.upsert_course")
    mock_load_content_files = mocker.patch("course_catalog.api.load_content_files")
    setup_s3_ocw_next(settings)
    s3_resource = boto3.resource("s3")

    sync_ocw_next_course(
        course_prefix=OCW_NEXT_TEST_PREFIX,
        s3_resource=s3_resource,
        force_overwrite=True,
    )

    assert Course.objects.last().title == "Unified Engineering I, II, III, & IV"
    assert Course.objects.last().course_id == "97db384ef34009a64df7cb86cf701979+16.01"
    assert Course.objects.last().ocw_next_course

    mock_upsert.assert_called_once()
    mock_load_content_files.assert_called_once()


@mock_s3
@pytest.mark.parametrize("overwrite", [True, False])
@pytest.mark.parametrize(
    "start_timestamp",
    [
        None,
        datetime(2020, 11, 15, tzinfo=pytz.utc),
        datetime(2020, 12, 15, tzinfo=pytz.utc),
    ],
)
def test_sync_ocw_next_course_already_synched(
    settings, mocker, overwrite, start_timestamp
):
    """ The course should be overwritten only if there is new data or overwrite is true """

    mock_upsert = mocker.patch("course_catalog.api.upsert_course")
    mocker.patch("course_catalog.api.load_content_files")

    setup_s3_ocw_next(settings)
    resource = boto3.resource("s3")

    course = CourseFactory.create(
        platform=PlatformType.ocw.value, course_id="Existing", title="Existing"
    )

    run = course.runs.last()
    # Set last_modified far in the future so it's greater then the last_modified of the objects in the fake s3 bucket
    # which is the current timestamp
    run.platform = PlatformType.ocw.value
    run.last_modified = format_date("2040-12-03 00:00:00 US/Eastern")
    run.run_id = "97db384ef34009a64df7cb86cf701979"
    run.save()
    course.runs.update(updated_on=datetime(2020, 12, 1, tzinfo=pytz.utc))

    sync_ocw_next_course(
        course_prefix=OCW_NEXT_TEST_PREFIX,
        s3_resource=resource,
        force_overwrite=overwrite,
        start_timestamp=start_timestamp,
    )

    course.refresh_from_db()

    if overwrite and start_timestamp != datetime(2020, 11, 15, tzinfo=pytz.utc):
        assert Course.objects.last().title == "Unified Engineering I, II, III, & IV"
        assert (
            Course.objects.last().course_id == "97db384ef34009a64df7cb86cf701979+16.01"
        )
        mock_upsert.assert_called_once()
    else:
        assert Course.objects.last().title == "Existing"
        assert Course.objects.last().course_id == "Existing"

        mock_upsert.assert_not_called()


@mock_s3
def test_sync_ocw_next_courses(settings, mocker):
    """Test sync_ocw_next_courses"""

    setup_s3_ocw_next(settings)
    overwrite = True
    start_timestamp = datetime(2020, 12, 15, tzinfo=pytz.utc)
    resource = boto3.resource("s3")
    mock_sync_course = mocker.patch("course_catalog.api.sync_ocw_next_course")

    sync_ocw_next_courses(
        course_prefixes=[OCW_NEXT_TEST_PREFIX],
        force_overwrite=overwrite,
        start_timestamp=start_timestamp,
    )

    mock_sync_course.assert_called_once_with(
        course_prefix=OCW_NEXT_TEST_PREFIX,
        s3_resource=resource,
        force_overwrite=overwrite,
        start_timestamp=start_timestamp,
    )


@mock_s3
@pytest.mark.parametrize(
    "course_urls, expected_prefixes",
    [
        [
            ["9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007"],
            [
                "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/"
            ],
        ],
        [
            [
                "9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007",
                "16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006",
            ],
            [
                "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/"
            ],
        ],
        [["16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006"], []],
        [
            None,
            [
                "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/"
            ],
        ],
    ],
)
def test_generate_course_prefix_list(settings, course_urls, expected_prefixes):
    """generate_course_prefix_list returns expected prefixes"""
    setup_s3(settings)
    bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)
    assert (
        generate_course_prefix_list(bucket, course_urls=course_urls)
        == expected_prefixes
    )
