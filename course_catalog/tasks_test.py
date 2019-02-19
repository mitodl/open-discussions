"""
Test tasks
"""
import json
from os import listdir
from os.path import isfile, join

from unittest.mock import Mock

import boto3
import botocore
import pytest
from moto import mock_s3

from course_catalog.models import Course, CoursePrice, CourseInstructor, CourseTopic
from course_catalog.tasks import sync_and_upload_edx_data, get_ocw_data

pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name,unused-argument

TEST_JSON_PATH = (
    "./test_json/PROD/9/9.15/Fall_2007/"
    "9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/0"
)
TEST_JSON_FILES = [
    f for f in listdir(TEST_JSON_PATH) if isfile(join(TEST_JSON_PATH, f))
]


@pytest.fixture
def mitx_data(settings):
    """
    Test MITx course data
    """
    settings.EDX_API_URL = "fake_url"
    settings.EDX_API_CLIENT_ID = "fake_id"
    settings.EDX_API_CLIENT_SECRET = "fake_secret"
    with open("./test_json/test_mitx_course.json", "r") as test_data:
        return json.load(test_data)


@pytest.fixture
def access_token(mocker):
    """
    Mock requests.post to retrieve a fake access token
    """
    mocker.patch(
        "requests.post",
        return_value=Mock(
            json=Mock(return_value={"access_token": "fake_access_token"})
        ),
    )


@pytest.fixture
def get_test_data(mocker, mitx_data):
    """
    Mock requests.get to retrieve fake course data
    """
    mocker.patch(
        "requests.get",
        return_value=Mock(status_code=200, json=Mock(return_value=mitx_data)),
    )


@pytest.fixture
def mock_logger(mocker):
    """
    Mock log exception
    """
    return mocker.patch("course_catalog.tasks.log.exception")


def setup_s3(settings):
    """
    Set up the fake s3 data
    """
    # Fake the settings
    settings.OCW_CONTENT_ACCESS_KEY = "abc"
    settings.OCW_CONTENT_SECRET_ACCESS_KEY = "abc"
    settings.OCW_CONTENT_BUCKET_NAME = "test_bucket"
    settings.OCW_LEARNING_COURSE_BUCKET_NAME = "testbucket2"
    settings.OCW_LEARNING_COURSE_ACCESS_KEY = "abc"
    settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY = "abc"
    # Create our fake bucket
    conn = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_CONTENT_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_CONTENT_SECRET_ACCESS_KEY,
    )
    conn.create_bucket(Bucket=settings.OCW_CONTENT_BUCKET_NAME)

    # Add data to the fake bucket
    test_bucket = conn.Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)
    for file in TEST_JSON_FILES:
        file_key = TEST_JSON_PATH.replace("./test_json/", "") + "/" + file
        with open(TEST_JSON_PATH + "/" + file, "r") as f:
            test_bucket.put_object(Key=file_key, Body=f.read())

    # Create our upload bucket
    conn = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
    )
    conn.create_bucket(Bucket=settings.OCW_LEARNING_COURSE_BUCKET_NAME)


@mock_s3
def test_get_mitx_data_valid(
    settings, access_token, get_test_data, mock_course_index_functions
):
    """
    Test that mitx sync task successfully creates database objects
    """
    setup_s3(settings)
    sync_and_upload_edx_data()
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 2
    assert CourseInstructor.objects.count() == 2
    assert CourseTopic.objects.count() == 1


@mock_s3
def test_get_mitx_data_saves_json(
    settings, mocker, access_token, get_test_data, mock_course_index_functions
):
    """
    Test that mitx sync task successfully saves edx data results file in S3
    """
    setup_s3(settings)
    sync_and_upload_edx_data()
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
    )
    obj = s3.Object(settings.OCW_LEARNING_COURSE_BUCKET_NAME, "edx_courses.json")
    # check that pub_object call to create edx_courses.json succeeded
    contents = json.loads(obj.get()["Body"].read())
    assert "results" in contents


@mock_s3
def test_get_mitx_data_status_error(settings, mocker, access_token, mitx_data):
    """
    Test that mitx sync task properly stops when it gets an error status code
    """
    mocker.patch(
        "requests.get",
        return_value=Mock(status_code=500, json=Mock(return_value=mitx_data)),
    )
    settings.EDX_API_URL = "fake_url"
    setup_s3(settings)
    sync_and_upload_edx_data()
    # check that no courses were created
    assert Course.objects.count() == 0
    # check that edx API data results file was not uploaded to s3
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
    )
    with pytest.raises(botocore.exceptions.ClientError):
        s3.Object(settings.OCW_LEARNING_COURSE_BUCKET_NAME, "edx_courses.json").load()


@mock_s3
def test_get_mitx_data_unexpected_error(settings, mocker, access_token, get_test_data):
    """
    Test that mitx sync task properly stops when it gets an error status code
    """
    mocker.patch(
        "course_catalog.task_helpers.get_year_and_semester", side_effect=Exception
    )
    settings.EDX_API_URL = "fake_url"
    setup_s3(settings)
    sync_and_upload_edx_data()
    assert Course.objects.count() == 0


def test_get_mitx_data_no_settings():
    """
    No data should be imported if MITx settings are missing
    """
    sync_and_upload_edx_data()
    assert Course.objects.count() == 0


@mock_s3
def test_get_ocw_data(settings, mock_course_index_functions):
    """
    Test ocw sync task
    """
    setup_s3(settings)

    # run ocw sync
    get_ocw_data()
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 1
    assert CourseTopic.objects.count() == 3

    get_ocw_data()
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 1
    assert CourseTopic.objects.count() == 3


def test_get_ocw_data_no_settings():
    """
    No data should be imported if OCW settings are missing
    """
    get_ocw_data()
    assert Course.objects.count() == 0


@mock_s3
def test_get_ocw_data_error_parsing(settings, mocker, mock_logger):
    """
    Test that an error parsing ocw data is correctly logged
    """
    mocker.patch(
        "course_catalog.tasks.OCWParser.setup_s3_uploading", side_effect=Exception
    )
    setup_s3(settings)
    get_ocw_data()
    mock_logger.assert_called_once_with(
        "Error encountered parsing OCW json for %s",
        "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/",
    )


@mock_s3
def test_get_ocw_data_error_reading_s3(settings, mocker, mock_logger):
    """
    Test that an error reading from S3 is correctly logged
    """
    mocker.patch("course_catalog.tasks.get_s3_object_and_read", side_effect=Exception)
    setup_s3(settings)
    get_ocw_data()
    mock_logger.assert_called_once_with(
        "Error encountered reading 1.json for %s",
        "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/",
    )


@mock_s3
@pytest.mark.parametrize("image_only", [True, False])
def test_get_ocw_data_upload_all_or_image(settings, mocker, image_only):
    """
    Test that the ocw parser uploads all files or just images depending on settings
    """
    settings.OCW_UPLOAD_IMAGE_ONLY = image_only
    mock_upload_all = mocker.patch(
        "course_catalog.tasks.OCWParser.upload_all_media_to_s3"
    )
    mock_upload_image = mocker.patch(
        "course_catalog.tasks.OCWParser.upload_course_image"
    )
    setup_s3(settings)
    get_ocw_data()
    assert mock_upload_image.call_count == (1 if image_only else 0)
    assert mock_upload_all.call_count == (0 if image_only else 1)
