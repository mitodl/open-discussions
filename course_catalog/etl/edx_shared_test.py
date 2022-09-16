"""ETL utils test"""
from subprocess import CalledProcessError

import pytest
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PlatformType
from course_catalog.etl.edx_shared import sync_edx_course_files
from course_catalog.factories import LearningResourceRunFactory
from course_catalog.models import Course

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "platform", [PlatformType.mitxonline.value, PlatformType.xpro.value]
)
def test_sync_edx_course_files(
    mock_mitxonline_learning_bucket, mock_xpro_learning_bucket, mocker, platform
):
    """sync mitxonline courses from a tarball stored in S3"""
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
    for run_id in run_ids:
        bucket.put_object(
            Key=f"20220101/courses/{run_id}.tar.gz",
            Body=open(f"test_json/{run_id}.tar.gz", "rb").read(),
            ACL="public-read",
        )
        run = LearningResourceRunFactory.create(
            platform=platform,
            run_id=run_id,
            content_type=ContentType.objects.get_for_model(Course),
        )
        course_ids.append(run.object_id)
    sync_edx_course_files(bucket.name, platform, course_ids)
    assert mock_transform.call_count == 2
    assert mock_transform.call_args[0][0].endswith(f"{run_id}.tar.gz") is True
    mock_load_content_files.assert_any_call(run, fake_data)
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
    bucket = (
        mock_mitxonline_learning_bucket
        if platform == PlatformType.mitxonline.value
        else mock_xpro_learning_bucket
    ).bucket
    bucket.put_object(
        Key=f"20220101/courses/{run.run_id}.tar.gz",
        Body=b"".join([b"x" for _ in range(100)]),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.edx_shared.load_content_files",
        autospec=True,
        return_value=[],
    )
    mocker.patch(
        "course_catalog.etl.edx_shared.check_call",
        side_effect=CalledProcessError(0, ""),
    )
    mock_log = mocker.patch("course_catalog.etl.edx_shared.log.exception")

    sync_edx_course_files(bucket.name, platform, [run.object_id])
    mock_load_content_files.assert_not_called()
    mock_log.assert_called_once()
    assert mock_log.call_args[0][0].startswith("Unable to untar ") is True


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
    bucket = (
        mock_mitxonline_learning_bucket
        if platform == PlatformType.mitxonline.value
        else mock_xpro_learning_bucket
    ).bucket
    bucket.put_object(
        Key="20220101/courses/some_other_course.tar.gz",
        Body=open("test_json/course-v1:MITxT+8.01.3x+3T2022.tar.gz", "rb").read(),
        ACL="public-read",
    )
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.edx_shared.load_content_files",
        autospec=True,
        return_value=[],
    )
    sync_edx_course_files(bucket.name, platform, [run.object_id])
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
    bucket = (
        mock_mitxonline_learning_bucket
        if platform == PlatformType.mitxonline.value
        else mock_xpro_learning_bucket
    ).bucket
    bucket.put_object(
        Key=f"20220101/courses/{run.run_id}.tar.gz",
        Body=open("test_json/course-v1:MITxT+8.01.3x+3T2022.tar.gz", "rb").read(),
        ACL="public-read",
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
    sync_edx_course_files(bucket.name, platform, [run.object_id])
    assert mock_transform.call_count == 1
    assert mock_transform.call_args[0][0].endswith(f"{run.run_id}.tar.gz") is True
    mock_load_content_files.assert_called_once_with(run, fake_data)
    assert mock_log.call_args[0][0].startswith("Error ingesting OLX content data for ")
