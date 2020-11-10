"""
Test course_catalog.api
"""
import json
from datetime import timedelta, datetime
from subprocess import CalledProcessError

import pytest
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from mock import ANY

from course_catalog.constants import (
    PlatformType,
    AvailabilityType,
    ResourceType,
    OfferedBy,
)
from course_catalog.factories import CourseFactory, LearningResourceRunFactory
from course_catalog.models import (
    Course,
    LearningResourceRun,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
)
from course_catalog.utils import get_ocw_topics
from course_catalog.api import (
    digest_ocw_course,
    safe_load_json,
    get_course_availability,
    parse_bootcamp_json_data,
    sync_ocw_course_files,
    sync_xpro_course_files,
    ocw_parent_folder,
    sync_ocw_course,
)

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
    assert course.offered_by.count() == 1
    assert course.offered_by.first().name == OfferedBy.ocw.value
    assert course.runs.first().offered_by.count() == 1
    assert course.runs.first().offered_by.first().name == OfferedBy.ocw.value

    course_instructors_count = CourseInstructor.objects.count()
    assert course_instructors_count == len(ocw_valid_data.get("instructors"))

    course_prices_count = CoursePrice.objects.count()
    assert course_prices_count == 1

    course_topics_count = CourseTopic.objects.count()
    assert course_topics_count == len(
        get_ocw_topics(ocw_valid_data.get("course_collections"))
    )


def deserializing_a_valid_ocw_course_with_existing_newer_run(
    mock_course_index_functions, ocw_valid_data
):
    """
    Verify that course values are not overwritten if the course already has a newer run
    """

    course = CourseFactory.create(
        platform=PlatformType.ocw.value,
        course_id=ocw_valid_data["course_id"],
        title="existing",
    )

    assert course.runs.count() == 3
    existing_run = course.runs.first()
    existing_run.best_start_date = datetime.now(timezone.utc)
    existing_run.save()

    digest_ocw_course(ocw_valid_data, timezone.now(), True)
    assert Course.objects.count() == 1
    course = Course.objects.last()
    assert course.title == "existing"
    assert course.runs.count() == 4


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
            Key="{}/{}_parsed.json".format(run.url.split("/")[-1], run.run_id),
            Body=fake_data,
            ACL="public-read",
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
