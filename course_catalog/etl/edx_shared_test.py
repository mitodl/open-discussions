"""ETL utils test"""
from subprocess import CalledProcessError

import pytest
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PlatformType
from course_catalog.etl.edx_shared import (
    get_most_recent_course_archives,
    sync_edx_course_files,
)
from course_catalog.factories import LearningResourceRunFactory
from course_catalog.models import Course, LearningResourceRun

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "platform, s3_prefix",
    [
        [PlatformType.mitxonline.value, "courses"],
        [PlatformType.xpro.value, "courses"],
        [PlatformType.mitx.value, "simeon-mitx-course-tarballs"],
    ],
)
def test_sync_edx_course_files(
    mock_mitxonline_learning_bucket,
    mock_xpro_learning_bucket,
    mocker,
    platform,
    s3_prefix,
):
    """sync edx courses from a tarball stored in S3"""
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.edx_shared.load_content_files",
        autospec=True,
        return_value=[],
    )
    mock_log = mocker.patch("course_catalog.etl.utils.log.exception")
    fake_data = '{"key": "data"}'
    mock_transform = mocker.patch(
        "course_catalog.etl.edx_shared.transform_content_files", return_value=fake_data
    )
    run_ids = ("course-v1:MITxT+8.01.3x+3T2022", "course-v1:MITxT+8.01.4x+3T2022")
    course_ids = []
    bucket = (
        mock_mitxonline_learning_bucket
        if platform == PlatformType.mitxonline.value
        else mock_xpro_learning_bucket
    ).bucket
    mocker.patch(
        "course_catalog.etl.edx_shared.get_learning_course_bucket", return_value=bucket
    )
    keys = [f"20220101/{s3_prefix}/{run_id}.tar.gz" for run_id in run_ids]
    for idx, run_id in enumerate(run_ids):
        bucket.put_object(
            Key=keys[idx],
            Body=open(f"test_json/{run_id}.tar.gz", "rb").read(),
            ACL="public-read",
        )
        run = LearningResourceRunFactory.create(
            platform=platform,
            run_id=run_id,
            content_type=ContentType.objects.get_for_model(Course),
        )
        course_ids.append(run.object_id)
    sync_edx_course_files(platform, course_ids, keys, s3_prefix)
    assert mock_transform.call_count == 2
    assert mock_load_content_files.call_count == 2
    assert mock_transform.call_args[0][0].endswith(f"{run_ids[1]}.tar.gz") is True
    for run_id in run_ids:
        mock_load_content_files.assert_any_call(
            LearningResourceRun.objects.get(run_id=run_id), fake_data
        )
    mock_log.assert_not_called()


@pytest.mark.parametrize(
    "platform", [PlatformType.mitxonline.value, PlatformType.xpro.value]
)
def test_sync_edx_course_files_invalid_tarfile(
    mock_mitxonline_learning_bucket, mock_xpro_learning_bucket, mocker, platform
):
    """an invalid mitxonline tarball should be skipped"""
    run = LearningResourceRunFactory.create(
        platform=platform,
        content_type=ContentType.objects.get_for_model(Course),
    )
    key = f"20220101/courses/{run.run_id}.tar.gz"
    bucket = (
        mock_mitxonline_learning_bucket
        if platform == PlatformType.mitxonline.value
        else mock_xpro_learning_bucket
    ).bucket
    bucket.put_object(
        Key=key,
        Body=b"".join([b"x" for _ in range(100)]),
        ACL="public-read",
    )
    mocker.patch(
        "course_catalog.etl.edx_shared.get_learning_course_bucket", return_value=bucket
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.edx_shared.load_content_files",
        autospec=True,
        return_value=[],
    )
    mocker.patch(
        "course_catalog.etl.edx_shared.transform_content_files",
        side_effect=CalledProcessError(0, ""),
    )
    mock_log = mocker.patch("course_catalog.etl.edx_shared.log.exception")

    sync_edx_course_files(platform, [run.object_id], [key])
    mock_load_content_files.assert_not_called()
    mock_log.assert_called_once()
    assert (
        mock_log.call_args[0][0].startswith("Error ingesting OLX content data for")
        is True
    )


@pytest.mark.parametrize(
    "platform", [PlatformType.mitxonline.value, PlatformType.xpro.value]
)
def test_sync_edx_course_files_empty_bucket(
    mock_mitxonline_learning_bucket, mock_xpro_learning_bucket, mocker, platform
):
    """If the mitxonline bucket has no tarballs matching a filename, it should be skipped"""
    run = LearningResourceRunFactory.create(
        platform=platform,
        content_type=ContentType.objects.get_for_model(Course),
    )
    key = "20220101/courses/some_other_course.tar.gz"
    bucket = (
        mock_mitxonline_learning_bucket
        if platform == PlatformType.mitxonline.value
        else mock_xpro_learning_bucket
    ).bucket
    bucket.put_object(
        Key=key,
        Body=open("test_json/course-v1:MITxT+8.01.3x+3T2022.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.edx_shared.load_content_files",
        autospec=True,
        return_value=[],
    )
    mocker.patch(
        "course_catalog.etl.edx_shared.get_learning_course_bucket", return_value=bucket
    )
    sync_edx_course_files(platform, [run.object_id], [key])
    mock_load_content_files.assert_not_called()


@pytest.mark.parametrize(
    "platform", [PlatformType.mitxonline.value, PlatformType.xpro.value]
)
def test_sync_edx_course_files_error(
    mock_mitxonline_learning_bucket, mock_xpro_learning_bucket, mocker, platform
):
    """Exceptions raised during sync_mitxonline_course_files should be logged"""
    run = LearningResourceRunFactory.create(
        platform=platform,
        content_type=ContentType.objects.get_for_model(Course),
    )
    key = f"20220101/courses/{run.run_id}.tar.gz"
    bucket = (
        mock_mitxonline_learning_bucket
        if platform == PlatformType.mitxonline.value
        else mock_xpro_learning_bucket
    ).bucket
    bucket.put_object(
        Key=key,
        Body=open("test_json/course-v1:MITxT+8.01.3x+3T2022.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mocker.patch(
        "course_catalog.etl.edx_shared.get_learning_course_bucket", return_value=bucket
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.edx_shared.load_content_files",
        autospec=True,
        side_effect=Exception,
    )
    fake_data = '{"key": "data"}'
    mock_log = mocker.patch("course_catalog.etl.edx_shared.log.exception")
    mock_transform = mocker.patch(
        "course_catalog.etl.edx_shared.transform_content_files", return_value=fake_data
    )
    sync_edx_course_files(platform, [run.object_id], [key])
    assert mock_transform.call_count == 1
    assert mock_transform.call_args[0][0].endswith(f"{run.run_id}.tar.gz") is True
    mock_load_content_files.assert_called_once_with(run, fake_data)
    assert mock_log.call_args[0][0].startswith("Error ingesting OLX content data for ")


@pytest.mark.parametrize("platform", [PlatformType.mitx.value, PlatformType.xpro.value])
def test_get_most_recent_course_archives(
    mocker, mock_mitxonline_learning_bucket, platform
):
    """get_most_recent_course_archives should return expected keys"""
    bucket = mock_mitxonline_learning_bucket.bucket
    base_key = "0101/courses/my-course.tar.gz"
    for year in [2021, 2022, 2023]:
        bucket.put_object(
            Key=f"{year}{base_key}",
            Body=open("test_json/course-v1:MITxT+8.01.3x+3T2022.tar.gz", "rb").read(),
            ACL="public-read",
        )
    mock_get_bucket = mocker.patch(
        "course_catalog.etl.edx_shared.get_learning_course_bucket", return_value=bucket
    )
    assert get_most_recent_course_archives(platform) == [f"2023{base_key}"]
    mock_get_bucket.assert_called_once_with(platform)


@pytest.mark.parametrize("platform", [PlatformType.mitx.value, PlatformType.xpro.value])
def test_get_most_recent_course_archives_empty(
    mocker, mock_mitxonline_learning_bucket, platform
):
    """Empty list should be returned and a warning logged if no recent tar archives are found"""
    bucket = mock_mitxonline_learning_bucket.bucket
    mock_get_bucket = mocker.patch(
        "course_catalog.etl.edx_shared.get_learning_course_bucket", return_value=bucket
    )
    mock_warning = mocker.patch("course_catalog.etl.edx_shared.log.warning")
    assert get_most_recent_course_archives(platform) == []
    mock_get_bucket.assert_called_once_with(platform)
    mock_warning.assert_called_once_with(
        "No %s exported courses found in S3 bucket %s", platform, bucket.name
    )


@pytest.mark.parametrize("platform", [PlatformType.mitx.value, PlatformType.xpro.value])
def test_get_most_recent_course_archives_no_bucket(settings, mocker, platform):
    """Empty list should be returned and a warning logged if no bucket is found"""
    settings.EDX_LEARNING_COURSE_BUCKET_NAME = None
    settings.XPRO_LEARNING_COURSE_BUCKET_NAME = None
    mock_warning = mocker.patch("course_catalog.etl.edx_shared.log.warning")
    assert get_most_recent_course_archives(platform) == []
    mock_warning.assert_called_once_with("No S3 bucket for platform %s", platform)
