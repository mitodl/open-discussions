"""Tests for MicroMasters ETL functions"""
import json

# pylint: disable=redefined-outer-name
from datetime import datetime
from itertools import chain
from subprocess import CalledProcessError

import pytest
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PlatformType
from course_catalog.etl import xpro
from course_catalog.etl.utils import UCC_TOPIC_MAPPINGS
from course_catalog.etl.xpro import _parse_datetime, sync_xpro_course_files
from course_catalog.factories import LearningResourceRunFactory
from course_catalog.models import Course
from open_discussions.test_utils import any_instance_of

pytestmark = pytest.mark.django_db


@pytest.fixture
def mock_xpro_programs_data():
    """Mock xpro data"""
    with open("./test_json/xpro_programs.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mock_xpro_courses_data():
    """Mock xpro data"""
    with open("./test_json/xpro_courses.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mocked_xpro_programs_responses(mocked_responses, settings, mock_xpro_programs_data):
    """Mock the programs api response"""
    settings.XPRO_CATALOG_API_URL = "http://localhost/test/programs/api"
    mocked_responses.add(
        mocked_responses.GET,
        settings.XPRO_CATALOG_API_URL,
        json=mock_xpro_programs_data,
    )
    yield mocked_responses


@pytest.fixture
def mocked_xpro_courses_responses(mocked_responses, settings, mock_xpro_courses_data):
    """Mock the courses api response"""
    settings.XPRO_COURSES_API_URL = "http://localhost/test/courses/api"
    mocked_responses.add(
        mocked_responses.GET, settings.XPRO_COURSES_API_URL, json=mock_xpro_courses_data
    )
    yield mocked_responses


@pytest.mark.usefixtures("mocked_xpro_programs_responses")
def test_xpro_extract_programs(mock_xpro_programs_data):
    """Verify that the extraction function calls the xpro programs API and returns the responses"""
    assert xpro.extract_programs() == mock_xpro_programs_data


def test_xpro_extract_programs_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.XPRO_CATALOG_API_URL = None
    assert xpro.extract_programs() == []


@pytest.mark.usefixtures("mocked_xpro_courses_responses")
def test_xpro_extract_courses(mock_xpro_courses_data):
    """Verify that the extraction function calls the xpro courses API and returns the responses"""
    assert xpro.extract_courses() == mock_xpro_courses_data


def test_xpro_extract_courses_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.XPRO_COURSES_API_URL = None
    assert xpro.extract_courses() == []


def test_xpro_transform_programs(mock_xpro_programs_data):
    """Test that xpro program data is correctly transformed into our normalized structure"""
    result = xpro.transform_programs(mock_xpro_programs_data)
    expected = [
        {
            "program_id": program_data["readable_id"],
            "title": program_data["title"],
            "image_src": program_data["thumbnail_url"],
            "short_description": program_data["description"],
            "offered_by": xpro.OFFERED_BY,
            "published": bool(program_data["current_price"]),
            "url": program_data["url"],
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
                    "platform": PlatformType.xpro.value,
                    "start_date": any_instance_of(datetime, type(None)),
                    "end_date": any_instance_of(datetime, type(None)),
                    "enrollment_start": any_instance_of(datetime, type(None)),
                    "best_start_date": _parse_datetime(
                        program_data["enrollment_start"] or program_data["start_date"]
                    ),
                    "best_end_date": _parse_datetime(program_data["end_date"]),
                    "prices": [{"price": program_data["current_price"], "mode": ""}]
                    if program_data["current_price"]
                    else [],
                    "instructors": [
                        {"full_name": instructor["name"]}
                        for instructor in program_data.get("instructors", [])
                    ],
                    "title": program_data["title"],
                    "short_description": program_data["description"],
                    "offered_by": xpro.OFFERED_BY,
                }
            ],
            "courses": [
                {
                    "course_id": course_data["readable_id"],
                    "platform": PlatformType.xpro.value,
                    "title": course_data["title"],
                    "image_src": course_data["thumbnail_url"],
                    "short_description": course_data["description"],
                    "offered_by": xpro.OFFERED_BY,
                    "published": any(
                        map(
                            lambda course_run: course_run.get("current_price", None),
                            course_data["courseruns"],
                        )
                    ),
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
                            "platform": PlatformType.xpro.value,
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
                            "offered_by": xpro.OFFERED_BY,
                            "published": bool(course_run_data["current_price"]),
                            "prices": [{"price": course_run_data["current_price"]}]
                            if course_run_data["current_price"]
                            else [],
                            "instructors": [
                                {"full_name": instructor["name"]}
                                for instructor in course_run_data["instructors"]
                            ],
                        }
                        for course_run_data in course_data["courseruns"]
                    ],
                }
                for course_data in program_data["courses"]
            ],
        }
        for program_data in mock_xpro_programs_data
    ]
    assert expected == result


def test_xpro_transform_courses(mock_xpro_courses_data):
    """Test that xpro courses data is correctly transformed into our normalized structure"""
    result = xpro.transform_courses(mock_xpro_courses_data)
    expected = [
        {
            "course_id": course_data["readable_id"],
            "platform": PlatformType.xpro.value,
            "title": course_data["title"],
            "image_src": course_data["thumbnail_url"],
            "short_description": course_data["description"],
            "offered_by": xpro.OFFERED_BY,
            "published": any(
                map(
                    lambda course_run: course_run.get("current_price", None),
                    course_data["courseruns"],
                )
            ),
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
                    "platform": PlatformType.xpro.value,
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
                    "offered_by": xpro.OFFERED_BY,
                    "published": bool(course_run_data["current_price"]),
                    "prices": [{"price": course_run_data["current_price"]}]
                    if course_run_data["current_price"]
                    else [],
                    "instructors": [
                        {"full_name": instructor["name"]}
                        for instructor in course_run_data["instructors"]
                    ],
                }
                for course_run_data in course_data["courseruns"]
            ],
        }
        for course_data in mock_xpro_courses_data
    ]
    assert expected == result


def test_sync_xpro_course_files_empty(mock_xpro_learning_bucket, mocker):
    """a tarball which doesn't contain other course tarballs should be skipped"""

    mock_xpro_learning_bucket.bucket.put_object(
        Key="path/to/exported_courses_123.tar.gz",
        Body=open("test_json/empty.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.xpro.load_content_files", autospec=True, return_value=[]
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
        "course_catalog.etl.xpro.load_content_files", autospec=True, return_value=[]
    )
    mocker.patch(
        "course_catalog.etl.xpro.check_call", side_effect=CalledProcessError(0, "")
    )
    mock_log = mocker.patch("course_catalog.etl.xpro.log.exception")
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
        "course_catalog.etl.xpro.load_content_files", autospec=True, return_value=[]
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
        "course_catalog.etl.xpro.load_content_files", autospec=True, return_value=[]
    )
    mock_log = mocker.patch("course_catalog.etl.xpro.log.info")
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
        "course_catalog.etl.xpro.load_content_files", autospec=True, return_value=[]
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
        "course_catalog.etl.xpro.load_content_files",
        autospec=True,
        side_effect=Exception,
    )
    course_content_type = ContentType.objects.get_for_model(Course)
    run = LearningResourceRunFactory.create(
        platform=PlatformType.xpro.value,
        run_id="content-devops-0001",
        content_type=course_content_type,
    )
    course_id = run.object_id
    fake_data = '{"key": "data"}'
    mock_log = mocker.patch("course_catalog.etl.xpro.log.exception")
    mock_transform = mocker.patch(
        "course_catalog.etl.xpro.transform_content_files", return_value=fake_data
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
        "course_catalog.etl.xpro.load_content_files", autospec=True, return_value=[]
    )
    course_content_type = ContentType.objects.get_for_model(Course)
    run = LearningResourceRunFactory.create(
        platform=PlatformType.xpro.value,
        run_id="content-devops-0001",
        content_type=course_content_type,
    )
    course_id = run.object_id
    fake_data = '{"key": "data"}'
    mock_log = mocker.patch("course_catalog.etl.xpro.log.exception")
    mock_transform = mocker.patch(
        "course_catalog.etl.xpro.transform_content_files", return_value=fake_data
    )
    sync_xpro_course_files(ids=[course_id])
    assert mock_transform.call_count == 1
    assert mock_transform.call_args[0][0].endswith("content-devops-0001.tar.gz") is True
    mock_load_content_files.assert_called_once_with(run, fake_data)
    mock_log.assert_not_called()
