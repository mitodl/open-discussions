"""
Test tasks
"""
import json
from unittest.mock import Mock

import boto3
import pytest
from moto import mock_s3

from course_catalog.conftest import setup_s3, TEST_PREFIX
from course_catalog.constants import PlatformType
from course_catalog.factories import CourseFactory
from course_catalog.models import Course, CoursePrice, CourseInstructor, CourseTopic
from course_catalog.tasks import (
    get_mitx_data,
    get_ocw_data,
    upload_ocw_parsed_json,
    get_bootcamp_data,
    get_micromasters_data,
    get_xpro_data,
    get_xpro_files,
    import_all_xpro_files,
    get_oll_data,
    get_youtube_data,
    get_youtube_transcripts,
    get_video_topics,
    get_ocw_courses,
    get_ocw_files,
    import_all_ocw_files,
    get_see_data,
    get_mitpe_data,
    get_csail_data,
    get_podcast_data,
    update_enrollments_for_email,
)
from open_discussions.factories import UserFactory


pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name,unused-argument,too-many-arguments


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


@pytest.fixture
def mock_blocklist(mocker):
    """Mock the load_course_blocklist function"""
    return mocker.patch("course_catalog.tasks.load_course_blocklist", return_value=[])


def test_get_mitx_data_valid(mocker):
    """Verify that the get_mitx_data invokes the MITx ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")

    get_mitx_data.delay()
    mock_pipelines.mitx_etl.assert_called_once_with()


@mock_s3
@pytest.mark.parametrize("force_overwrite", [True, False])
@pytest.mark.parametrize("upload_to_s3", [True, False])
def test_get_ocw_data(
    settings, mocker, mocked_celery, mock_blocklist, force_overwrite, upload_to_s3
):
    """Test get_ocw_data task"""
    setup_s3(settings)
    get_ocw_courses_mock = mocker.patch(
        "course_catalog.tasks.get_ocw_courses", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        get_ocw_data.delay(force_overwrite=force_overwrite, upload_to_s3=upload_to_s3)
    assert mocked_celery.group.call_count == 1
    get_ocw_courses_mock.si.assert_called_once_with(
        course_prefixes=[TEST_PREFIX],
        blocklist=mock_blocklist.return_value,
        force_overwrite=force_overwrite,
        upload_to_s3=upload_to_s3,
    )


@mock_s3
@pytest.mark.parametrize("blocklisted", [True, False])
def test_get_ocw_courses(
    settings,
    mocker,
    mock_course_index_functions,
    mocked_celery,
    mock_blocklist,
    blocklisted,
):
    """
    Test ocw sync task
    """
    setup_s3(settings)

    if blocklisted:
        mock_blocklist.return_value = ["9.15"]

    mocker.patch("course_catalog.api.load_content_files")
    mocker.patch("course_catalog.api.transform_content_files")

    # run ocw sync
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=mock_blocklist.return_value,
        force_overwrite=False,
        upload_to_s3=True,
    )
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 1
    assert CourseTopic.objects.count() == 7
    course = Course.objects.first()
    assert course.published is not blocklisted

    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    # The filename was pulled from the uid 1.json in the TEST_JSON_PATH files.
    obj = s3.Object(
        settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        "9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007_parsed.json",
    )
    assert json.loads(obj.get()["Body"].read())

    if not blocklisted:
        assert course.image_src.startswith("http")
    else:
        assert course.image_src == ""


@mock_s3
@pytest.mark.parametrize("overwrite", [True, False])
def test_get_ocw_overwrite(
    mocker, settings, mock_course_index_functions, mock_blocklist, overwrite
):
    """Test that courses are overridden if force_overwrite=True"""
    setup_s3(settings)

    # run ocw sync
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=mock_blocklist.return_value,
        force_overwrite=False,
        upload_to_s3=True,
    )
    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 1
    assert CourseTopic.objects.count() == 7

    mock_digest = mocker.patch("course_catalog.api.digest_ocw_course")
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=mock_blocklist.return_value,
        force_overwrite=overwrite,
        upload_to_s3=True,
    )
    assert mock_digest.call_count == (1 if overwrite else 0)


@mock_s3
def test_get_ocw_typeerror(mocker, settings):
    """Test that a course is skipped if digest_ocw_course returns None"""
    setup_s3(settings)
    mock_info_logger = mocker.patch("course_catalog.api.log.info")
    mocker.patch("course_catalog.api.digest_ocw_course", return_value=None)
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=[],
        force_overwrite=True,
        upload_to_s3=True,
    )
    mock_info_logger.assert_any_call("Course and run not returned, skipping")


def test_get_ocw_data_no_settings(settings):
    """
    No data should be imported if OCW settings are missing
    """
    settings.AWS_ACCESS_KEY_ID = None
    get_ocw_data.delay(force_overwrite=True, upload_to_s3=True)
    assert Course.objects.count() == 0


@mock_s3
def test_get_ocw_data_error_parsing(settings, mocker, mock_logger, mocked_celery):
    """
    Test that an error parsing ocw data is correctly logged
    """
    mocker.patch(
        "course_catalog.api.OCWParser.setup_s3_uploading", side_effect=Exception
    )
    setup_s3(settings)
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=[],
        force_overwrite=False,
        upload_to_s3=True,
    )
    mock_logger.assert_any_call(
        "Error encountered parsing OCW json for %s", TEST_PREFIX
    )


@mock_s3
def test_get_ocw_data_error_reading_s3(settings, mocker, mock_logger, mocked_celery):
    """
    Test that an error reading from S3 is correctly logged
    """
    mocker.patch("course_catalog.api.get_s3_object_and_read", side_effect=Exception)
    setup_s3(settings)
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=[],
        force_overwrite=False,
        upload_to_s3=True,
    )
    mock_logger.assert_called_once_with(
        "Error encountered reading 1.json for %s",
        "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/",
    )


@mock_s3
@pytest.mark.parametrize("image_only", [True, False])
def test_get_ocw_data_upload_all_or_image(settings, mocker, image_only, mocked_celery):
    """
    Test that the ocw parser uploads all files or just images depending on settings
    """
    settings.OCW_UPLOAD_IMAGE_ONLY = image_only
    mock_upload_all = mocker.patch(
        "course_catalog.api.OCWParser.upload_all_media_to_s3"
    )
    mock_upload_image = mocker.patch("course_catalog.api.OCWParser.upload_course_image")
    setup_s3(settings)
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=[],
        force_overwrite=False,
        upload_to_s3=True,
    )
    assert mock_upload_image.call_count == (1 if image_only else 0)
    assert mock_upload_all.call_count == (0 if image_only else 1)


@mock_s3
def test_upload_ocw_parsed_json(settings, mocker):
    """
    Test that ocw_upload_parsed_json uploads to S3
    """
    setup_s3(settings)

    course = CourseFactory.create(platform=PlatformType.ocw.value)
    course.url = "http://ocw.mit.edu/courses/brain-and-cognitive-sciences/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007"
    course.raw_json = {"test": "json"}
    course.save()

    upload_ocw_parsed_json.delay()

    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    # The filename was pulled from the uid 1.json in the TEST_JSON_PATH files.
    obj = s3.Object(
        settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        f"9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/{course.course_id}_parsed.json",
    )
    assert json.loads(obj.get()["Body"].read())


@mock_s3
def test_get_ocw_files(mocker, settings):
    """Test that get_ocw_files calls api.sync_ocw_course_files with the correct ids"""
    mock_sync_ocw_course_files = mocker.patch(
        "course_catalog.tasks.sync_ocw_course_files"
    )
    setup_s3(settings)
    ids = [1, 2, 3]
    get_ocw_files(ids)
    mock_sync_ocw_course_files.assert_called_with(ids)


def test_get_ocw_files_missing_settings(mocker, settings):
    """Test that get_ocw_files does nothing without required settings"""
    mock_sync_ocw_course_files = mocker.patch(
        "course_catalog.tasks.sync_ocw_course_files"
    )
    mock_log = mocker.patch("course_catalog.tasks.log.warning")
    settings.OCW_LEARNING_COURSE_BUCKET_NAME = None
    get_ocw_files([1, 2])
    mock_sync_ocw_course_files.assert_not_called()
    mock_log.assert_called_once_with("Required settings missing for get_ocw_files")


@mock_s3
def test_import_all_ocw_files(settings, mocker, mocked_celery, mock_blocklist):
    """Test get_ocw_data task"""
    setup_s3(settings)
    get_ocw_files_mock = mocker.patch(
        "course_catalog.tasks.get_ocw_files", autospec=True
    )
    courses = CourseFactory.create_batch(
        3, platform=PlatformType.ocw.value, published=True
    )
    CourseFactory.create_batch(3, platform=PlatformType.oll.value, published=False)

    with pytest.raises(mocked_celery.replace_exception_class):
        import_all_ocw_files.delay(3)
    assert mocked_celery.group.call_count == 1
    get_ocw_files_mock.si.assert_called_once_with([course.id for course in courses])


@mock_s3
def test_get_xpro_files(mocker, settings):
    """Test that get_xpro_files calls api.sync_xpro_course_files with the correct ids"""
    mock_sync_xpro_course_files = mocker.patch(
        "course_catalog.tasks.sync_xpro_course_files"
    )
    setup_s3(settings)
    ids = [1, 2, 3]
    get_xpro_files(ids)
    mock_sync_xpro_course_files.assert_called_with(ids)


def test_get_xpro_files_missing_settings(mocker, settings):
    """Test that get_xpro_files does nothing without required settings"""
    mock_sync_xpro_course_files = mocker.patch(
        "course_catalog.tasks.sync_xpro_course_files"
    )
    mock_log = mocker.patch("course_catalog.tasks.log.warning")
    settings.XPRO_LEARNING_COURSE_BUCKET_NAME = None
    get_xpro_files([1, 2])
    mock_sync_xpro_course_files.assert_not_called()
    mock_log.assert_called_once_with("Required settings missing for get_xpro_files")


@mock_s3
def test_import_all_xpro_files(settings, mocker, mocked_celery, mock_blocklist):
    """import_all_xpro_files should start chunked tasks which """
    setup_s3(settings)
    get_xpro_files_mock = mocker.patch(
        "course_catalog.tasks.get_xpro_files", autospec=True
    )
    courses = CourseFactory.create_batch(
        3, platform=PlatformType.xpro.value, published=True
    )
    CourseFactory.create_batch(3, platform=PlatformType.oll.value, published=False)

    with pytest.raises(mocked_celery.replace_exception_class):
        import_all_xpro_files.delay(3)
    assert mocked_celery.group.call_count == 1
    get_xpro_files_mock.si.assert_called_once_with([course.id for course in courses])


def test_process_bootcamps(mock_get_bootcamps):
    """
    Test that bootcamp json data is properly parsed
    """
    get_bootcamp_data.delay()
    assert Course.objects.filter(platform=PlatformType.bootcamps.value).count() == 3

    bootcamp = Course.objects.get(course_id="Bootcamp1")
    assert bootcamp.title == "MIT HMS Healthcare Innovation Bootcamp"

    bootcamp = Course.objects.get(course_id="Bootcamp2")
    assert bootcamp.title == "MIT Deep Technology Bootcamp"

    bootcamp = Course.objects.get(course_id="Bootcamp3")
    assert bootcamp.title == "MIT Sports Entrepreneurship Bootcamp"

    get_bootcamp_data.delay()

    assert Course.objects.filter(platform=PlatformType.bootcamps.value).count() == 3


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


def test_get_see_data(mocker):
    """Verify that get_see_data invokes the SEE ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_see_data.delay()
    mock_pipelines.see_etl.assert_called_once_with()


def test_get_mitpe_data(mocker):
    """Verify that get_mitpe_data invokes the MITPE ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_mitpe_data.delay()
    mock_pipelines.mitpe_etl.assert_called_once_with()


def test_get_csail_data(mocker):
    """Verify that get_mitpe_data invokes the CSAIL ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_csail_data.delay()
    mock_pipelines.csail_etl.assert_called_once_with()


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


def test_get_podcast_data(mocker):
    """Verify that get_podcast_data invokes the podcast ETL pipeline with expected params"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_podcast_data.delay()
    mock_pipelines.podcast_etl.assert_called_once()


def test_update_enrollments_for_email(mocker):
    """Verify that update_enrollments_for_email call update_enrollments_for_user job"""
    user = UserFactory.create()
    mock_task = mocker.patch(
        "course_catalog.etl.enrollments.update_enrollments_for_user"
    )
    update_enrollments_for_email.delay(user.email)
    mock_task.assert_called_once_with(user)


def test_update_enrollments_for_email_email_does_not_exist(mocker):
    """Verify that update_enrollments_for_email call update_enrollments_for_user job"""
    mock_task = mocker.patch(
        "course_catalog.etl.enrollments.update_enrollments_for_user"
    )
    update_enrollments_for_email.delay("fake_email")
    mock_task.assert_not_called()
