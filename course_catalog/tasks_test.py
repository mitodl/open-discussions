"""
Test tasks
"""
import json
from os import listdir
from os.path import isfile, join
from unittest.mock import Mock

import boto3
import pytest
from moto import mock_s3

from course_catalog.constants import PlatformType
from course_catalog.factories import CourseFactory
from course_catalog.models import (
    Course,
    CoursePrice,
    CourseInstructor,
    CourseTopic,
    Bootcamp,
)
from course_catalog.tasks import (
    get_mitx_data,
    get_ocw_data,
    upload_ocw_master_json,
    get_bootcamp_data,
    get_micromasters_data,
    get_xpro_data,
    get_oll_data,
    get_youtube_data,
    get_youtube_transcripts,
    get_video_topics,
)


pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name,unused-argument,too-many-arguments

TEST_JSON_PATH = (
    "./test_json/PROD/9/9.15/Fall_2007/"
    "9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/0"
)
TEST_JSON_FILES = [
    f for f in listdir(TEST_JSON_PATH) if isfile(join(TEST_JSON_PATH, f))
]


@pytest.fixture
def mock_logger(mocker):
    """
    Mock log exception
    """
    return mocker.patch("course_catalog.api.log.exception")


@pytest.fixture
def mock_get_bootcamps(mocker):
    """
    Mock the call to get bootcamps json
    """
    with open("test_json/bootcamps.json", "r") as bootcamp_file:
        bootcamp_json = json.load(bootcamp_file)

    mocker.patch(
        "requests.get",
        return_value=Mock(status_code=200, json=Mock(return_value=bootcamp_json)),
    )


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


def test_get_mitx_data_valid(mocker):
    """Verify that the get_mitx_data invokes the MITx ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_mitx_data.delay()
    mock_pipelines.mitx_etl.assert_called_once_with()


@mock_s3
def test_get_ocw_data(settings, mock_course_index_functions):
    """
    Test ocw sync task
    """
    setup_s3(settings)

    # run ocw sync
    get_ocw_data.delay()
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 1
    assert CourseTopic.objects.count() == 3

    get_ocw_data.delay()
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 1
    assert CourseTopic.objects.count() == 3
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
    )
    # The filename was pulled from the uid 1.json in the TEST_JSON_PATH files.
    obj = s3.Object(
        settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        "9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/16197636c270e1ab179fbc9a56c72787_master.json",
    )
    assert json.loads(obj.get()["Body"].read())


@mock_s3
@pytest.mark.parametrize("overwrite", [True, False])
def test_get_ocw_overwrite(mocker, settings, mock_course_index_functions, overwrite):
    """Test that courses are overridden if force_overwrite=True"""
    setup_s3(settings)

    # run ocw sync
    get_ocw_data.delay()
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 1
    assert CourseTopic.objects.count() == 3

    mock_digest = mocker.patch("course_catalog.api.digest_ocw_course")
    get_ocw_data.delay(force_overwrite=overwrite)
    assert mock_digest.call_count == (1 if overwrite else 0)


def test_get_ocw_data_no_settings(settings):
    """
    No data should be imported if OCW settings are missing
    """
    settings.OCW_CONTENT_ACCESS_KEY = None
    get_ocw_data.delay()
    assert Course.objects.count() == 0


@mock_s3
def test_get_ocw_data_error_parsing(settings, mocker, mock_logger):
    """
    Test that an error parsing ocw data is correctly logged
    """
    mocker.patch(
        "course_catalog.api.OCWParser.setup_s3_uploading", side_effect=Exception
    )
    setup_s3(settings)
    get_ocw_data.delay()
    mock_logger.assert_called_once_with(
        "Error encountered parsing OCW json for %s",
        "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/",
    )


@mock_s3
def test_get_ocw_data_error_reading_s3(settings, mocker, mock_logger):
    """
    Test that an error reading from S3 is correctly logged
    """
    mocker.patch("course_catalog.api.get_s3_object_and_read", side_effect=Exception)
    setup_s3(settings)
    get_ocw_data.delay()
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
        "course_catalog.api.OCWParser.upload_all_media_to_s3"
    )
    mock_upload_image = mocker.patch("course_catalog.api.OCWParser.upload_course_image")
    setup_s3(settings)
    get_ocw_data.delay()
    assert mock_upload_image.call_count == (1 if image_only else 0)
    assert mock_upload_all.call_count == (0 if image_only else 1)


@mock_s3
def test_upload_ocw_master_json(settings, mocker):
    """
    Test that ocw_upload_master_json uploads to S3
    """
    setup_s3(settings)

    course = CourseFactory.create(platform=PlatformType.ocw.value)
    course.url = "http://ocw.mit.edu/courses/brain-and-cognitive-sciences/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007"
    course.raw_json = {"test": "json"}
    course.save()

    upload_ocw_master_json.delay()

    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
    )
    # The filename was pulled from the uid 1.json in the TEST_JSON_PATH files.
    obj = s3.Object(
        settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        f"9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/{course.course_id}_master.json",
    )
    assert json.loads(obj.get()["Body"].read())


def test_process_bootcamps(mock_get_bootcamps):
    """
    Test that bootcamp json data is properly parsed
    """
    get_bootcamp_data.delay()
    assert Bootcamp.objects.count() == 3
    assert Course.objects.count() == 0

    bootcamp = Bootcamp.objects.get(course_id="Bootcamp1")
    assert bootcamp.title == "MIT HMS Healthcare Innovation Bootcamp"

    bootcamp = Bootcamp.objects.get(course_id="Bootcamp2")
    assert bootcamp.title == "MIT Deep Technology Bootcamp"

    bootcamp = Bootcamp.objects.get(course_id="Bootcamp3")
    assert bootcamp.title == "MIT Sports Entrepreneurship Bootcamp"

    get_bootcamp_data.delay()

    assert Bootcamp.objects.count() == 3
    assert Course.objects.count() == 0


def test_get_micromasters_data(mocker):
    """Verify that the get_micromasters_data invokes the MicroMasters ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_micromasters_data.delay()
    mock_pipelines.micromasters_etl.assert_called_once_with()


def test_get_xpro_data(mocker):
    """Verify that the get_xpro_data invokes the xPro ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_xpro_data.delay()
    mock_pipelines.xpro_programs_etl.assert_called_once_with()
    mock_pipelines.xpro_courses_etl.assert_called_once_with()


def test_get_oll_data(mocker):
    """Verify that the get_oll_data invokes the OLL ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_oll_data.delay()
    mock_pipelines.oll_etl.assert_called_once_with()


@pytest.mark.parametrize("channel_ids", [["abc", "123"], None])
def test_get_youtube_data(mocker, settings, channel_ids):
    """Verify that the get_youtube_data invokes the YouTube ETL pipeline with expected params"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_youtube_data.delay(channel_ids=channel_ids)
    mock_pipelines.youtube_etl.assert_called_once_with(channel_ids=channel_ids)


def test_get_youtube_transcripts(mocker):
    """Verify that get_youtube_transcripts invokes correct course_catalog.etl.youtube functions"""

    mock_course_catalog_youtube = mocker.patch("course_catalog.tasks.youtube")

    get_youtube_transcripts(created_after=None, created_minutes=2000, overwrite=True)

    mock_course_catalog_youtube.get_youtube_videos_for_transcripts_job.assert_called_once_with(
        created_after=None, created_minutes=2000, overwrite=True
    )

    mock_course_catalog_youtube.get_youtube_transcripts.assert_called_once_with(
        mock_course_catalog_youtube.get_youtube_videos_for_transcripts_job.return_value
    )


@pytest.mark.parametrize("video_ids", [None, [1, 2]])
def test_get_video_topics(mocker, video_ids):
    """Test that get_video_topics calls the corresponding pipeline method"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_video_topics.delay(video_ids=video_ids)
    mock_pipelines.video_topics_etl.assert_called_once_with(video_ids=video_ids)
