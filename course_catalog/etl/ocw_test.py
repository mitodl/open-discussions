"""OCW ETL tests"""
# pylint: disable=redefined-outer-name
import json

import pytest

from course_catalog.etl.ocw import upload_mitx_course_manifest


def test_upload_mitx_course_manifest(mock_ocw_learning_bucket, ocw_aws_settings):
    """Test that upload_mitx_course_manifest performs an upload to the OCW bucket"""
    courses = [{"value": 1}]

    assert upload_mitx_course_manifest(courses) is True

    obj = mock_ocw_learning_bucket.s3.Object(
        ocw_aws_settings.OCW_LEARNING_COURSE_BUCKET_NAME, "edx_courses.json"
    )

    # check that put_object called to create/update edx_courses.json succeeded
    contents = json.loads(obj.get()["Body"].read())
    assert contents == {"results": courses, "count": len(courses)}


@pytest.mark.parametrize(
    "disabled_setting_name",
    [
        "OCW_LEARNING_COURSE_BUCKET_NAME",
        "OCW_LEARNING_COURSE_ACCESS_KEY",
        "OCW_LEARNING_COURSE_SECRET_ACCESS_KEY",
    ],
)
def test_upload_mitx_course_manifest_disabled(ocw_aws_settings, disabled_setting_name):
    """Test that upload_mitx_course_manifest doe not perform the upload is a setting is disabled"""
    # if this tries to hit S3 it will fail since the bucket doesn't exist in moto
    setattr(ocw_aws_settings, disabled_setting_name, None)
    assert upload_mitx_course_manifest([{"value": 1}]) is False


def test_upload_mitx_course_manifest_no_courses():
    """Test that upload_mitx_course_manifest doe not perform the upload if an empty course lists is passed"""
    # if this tries to hit S3 it will fail since the bucket doesn't exist in moto
    assert upload_mitx_course_manifest([]) is False
