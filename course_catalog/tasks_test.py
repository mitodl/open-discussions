"""
Test tasks
"""
import json
from contextlib import contextmanager

import boto3
import pytest
from mock.mock import ANY
from moto import mock_s3

from course_catalog.conftest import (
    OCW_NEXT_TEST_PREFIX,
    TEST_PREFIX,
    setup_s3,
    setup_s3_ocw_next,
)
from course_catalog.constants import PlatformType
from course_catalog.factories import CourseFactory, LearningResourceRunFactory
from course_catalog.models import Course, CourseInstructor, CoursePrice, CourseTopic
from course_catalog.tasks import (
    get_content_files,
    get_content_tasks,
    get_micromasters_data,
    get_mitx_data,
    get_mitxonline_data,
    get_ocw_courses,
    get_ocw_data,
    get_ocw_files,
    get_ocw_next_courses,
    get_ocw_next_data,
    get_oll_data,
    get_podcast_data,
    get_video_topics,
    get_xpro_data,
    get_youtube_data,
    get_youtube_transcripts,
    import_all_mitxonline_files,
    import_all_ocw_files,
    import_all_xpro_files,
    update_enrollments_for_email,
    upload_ocw_parsed_json,
    import_all_mitx_files,
)
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db
# pylint:disable=redefined-outer-name,unused-argument,too-many-arguments


@contextmanager
def does_not_raise():
    """
    Mock expression that does not raise an error
    """
    yield


@pytest.fixture
def mock_logger(mocker):
    """
    Mock log exception
    """
    return mocker.patch("course_catalog.api.log.exception")


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
@pytest.mark.parametrize("force_s3_upload", [True, False])
@pytest.mark.parametrize("upload_to_s3", [True, False])
def test_get_ocw_data(
    settings,
    mocker,
    mocked_celery,
    mock_blocklist,
    force_overwrite,
    upload_to_s3,
    force_s3_upload,
):
    """Test get_ocw_data task"""
    setup_s3(settings)
    get_ocw_courses_mock = mocker.patch(
        "course_catalog.tasks.get_ocw_courses", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        get_ocw_data.delay(
            force_overwrite=force_overwrite,
            upload_to_s3=upload_to_s3,
            force_s3_upload=force_s3_upload,
        )
    assert mocked_celery.group.call_count == 1
    get_ocw_courses_mock.si.assert_called_once_with(
        course_prefixes=[TEST_PREFIX],
        blocklist=mock_blocklist.return_value,
        force_overwrite=force_overwrite,
        upload_to_s3=upload_to_s3,
        utc_start_timestamp=None,
        force_s3_upload=force_s3_upload,
    )


@mock_s3
@pytest.mark.parametrize("force_overwrite", [True, False])
@pytest.mark.parametrize(
    "url_substring",
    [
        None,
        "16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006",
        "not-a-match",
    ],
)
def test_get_ocw_next_data(
    settings, mocker, mocked_celery, force_overwrite, url_substring
):
    """Test get_ocw_next_data task"""
    setup_s3_ocw_next(settings)
    get_ocw_courses_mock = mocker.patch(
        "course_catalog.tasks.get_ocw_next_courses", autospec=True
    )

    if url_substring == "not-a-match":
        error_expectation = does_not_raise()
    else:
        error_expectation = pytest.raises(mocked_celery.replace_exception_class)

    with error_expectation:
        get_ocw_next_data.delay(
            force_overwrite=force_overwrite, course_url_substring=url_substring
        )

    if url_substring == "not-a-match":
        assert mocked_celery.group.call_count == 0
    else:
        assert mocked_celery.group.call_count == 1
        get_ocw_courses_mock.si.assert_called_once_with(
            url_paths=[OCW_NEXT_TEST_PREFIX],
            force_overwrite=force_overwrite,
            utc_start_timestamp=None,
        )


@mock_s3
def test_get_ocw_next_courses(settings, mocker, mocked_celery):
    """
    Test get_ocw_next_courses
    """
    setup_s3_ocw_next(settings)

    get_ocw_next_courses.delay(url_paths=[OCW_NEXT_TEST_PREFIX], force_overwrite=False)

    assert Course.objects.count() == 1
    assert CoursePrice.objects.count() == 1
    assert CourseInstructor.objects.count() == 10
    assert CourseTopic.objects.count() == 11

    course = Course.objects.first()
    assert course.title == "Unified Engineering I, II, III, & IV"
    assert course.course_id == "97db384ef34009a64df7cb86cf701979+16.01"
    assert course.runs.count() == 1
    assert course.runs.first().run_id == "97db384ef34009a64df7cb86cf701979"
    assert (
        course.runs.first().slug
        == "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006"
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
@pytest.mark.parametrize("force_s3_upload", [True, False])
def test_get_ocw_force_s3_upload(
    mocker, settings, mock_course_index_functions, mock_blocklist, force_s3_upload
):
    """Test that ocw-next courses are not overridden but parsed json is uploaded to s3 if force_s3_upload=True"""
    setup_s3(settings)

    lr = LearningResourceRunFactory.create(
        platform=PlatformType.ocw.value,
        slug=TEST_PREFIX,
        run_id="16197636c270e1ab179fbc9a56c72787",
        content_object=CourseFactory(
            platform=PlatformType.ocw.value, ocw_next_course=True
        ),
    )
    mock_digest = mocker.patch(
        "course_catalog.api.digest_ocw_course", return_value=(lr.content_object, lr)
    )
    mock_parse_json = mocker.patch("course_catalog.api.OCWParser.get_parsed_json")

    # run ocw sync
    get_ocw_courses.delay(
        course_prefixes=[TEST_PREFIX],
        blocklist=mock_blocklist.return_value,
        force_overwrite=False,
        upload_to_s3=False,
        force_s3_upload=force_s3_upload,
    )

    assert mock_digest.call_count == 0
    assert mock_parse_json.call_count == (1 if force_s3_upload else 0)


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
def test_import_all_xpro_files(settings, mocker, mocked_celery, mock_blocklist):
    """import_all_xpro_files should start chunked tasks with correct bucket, platform"""
    setup_s3(settings)
    get_content_tasks_mock = mocker.patch(
        "course_catalog.tasks.get_content_tasks", autospec=True
    )
    with pytest.raises(mocked_celery.replace_exception_class):
        import_all_xpro_files.delay(3)
    get_content_tasks_mock.assert_called_once_with(
        settings.XPRO_LEARNING_COURSE_BUCKET_NAME, PlatformType.xpro.value, 3
    )


@mock_s3
def test_import_all_mitx_files(settings, mocker, mocked_celery, mock_blocklist):
    """import_all_mitx_files should start chunked tasks with correct bucket, platform"""
    setup_s3(settings)
    get_content_tasks_mock = mocker.patch(
        "course_catalog.tasks.get_content_tasks", autospec=True
    )
    with pytest.raises(mocked_celery.replace_exception_class):
        import_all_mitx_files.delay(4)
    get_content_tasks_mock.assert_called_once_with(
        settings.EDX_LEARNING_COURSE_BUCKET_NAME,
        PlatformType.mitx.value,
        4,
        s3_prefix="simeon-mitx-course-tarballs",
    )


def test_get_content_tasks(mocker, mocked_celery, settings):
    """Test that get_content_tasks calls get_content_files with the correct args"""
    mock_get_content_files = mocker.patch("course_catalog.tasks.get_content_files.si")
    mocker.patch("course_catalog.tasks.load_course_blocklist", return_value=[])
    setup_s3(settings)

    platform = PlatformType.mitx.value
    CourseFactory.create_batch(3, published=True, platform=platform)
    bucket_name = "test-bucket"

    s3_prefix = "course-prefix"
    get_content_tasks(bucket_name, platform, 2, s3_prefix)
    assert mocked_celery.group.call_count == 1
    assert (
        Course.objects.filter(published=True)
        .filter(platform=platform)
        .exclude(course_id__in=[])
        .order_by("id")
        .values_list("id", flat=True)
    ).count() == 3
    assert mock_get_content_files.call_count == 2
    mock_get_content_files.assert_any_call(
        ANY, bucket_name, platform, s3_prefix=s3_prefix
    )


def test_get_test_get_content_tasks_missing_settings(mocker, settings):
    """Test that get_content_files does nothing without required settings"""
    mock_sync_edx_course_files = mocker.patch(
        "course_catalog.tasks.sync_edx_course_files"
    )
    mock_log = mocker.patch("course_catalog.tasks.log.warning")
    settings.MITX_ONLINE_LEARNING_COURSE_BUCKET_NAME = None
    platform = "mitx"
    get_content_files(
        [1, 2], settings.MITX_ONLINE_LEARNING_COURSE_BUCKET_NAME, platform
    )
    mock_sync_edx_course_files.assert_not_called()
    mock_log.assert_called_once_with("Required settings missing for %s files", platform)


@mock_s3
def test_import_all_mitxonline_files(settings, mocker, mocked_celery, mock_blocklist):
    """import_all_mitxonline_files should be replaced with get_content_tasks"""
    setup_s3(settings)
    get_content_tasks_mock = mocker.patch(
        "course_catalog.tasks.get_content_tasks", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        import_all_mitxonline_files.delay(3)
    get_content_tasks_mock.assert_called_once_with(
        settings.MITX_ONLINE_LEARNING_COURSE_BUCKET_NAME,
        PlatformType.mitxonline.value,
        3,
    )


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


def test_get_mitxonline_data(mocker):
    """Verify that the get_mitxonline_data invokes the MITx Online ETL pipeline"""
    mock_pipelines = mocker.patch("course_catalog.tasks.pipelines")
    get_mitxonline_data.delay()
    mock_pipelines.mitxonline_programs_etl.assert_called_once_with()
    mock_pipelines.mitxonline_courses_etl.assert_called_once_with()


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
