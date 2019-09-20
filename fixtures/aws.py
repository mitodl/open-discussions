"""Fixtures for AWS"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

import boto3
from moto import mock_s3
import pytest


@pytest.fixture(autouse=True)
def ocw_aws_settings(settings):
    """Default OCW test settings"""
    settings.OCW_LEARNING_COURSE_BUCKET_NAME = "test-bucket"  # impossible bucket name
    settings.OCW_LEARNING_COURSE_ACCESS_KEY = "access_key"
    settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY = "secret_key"
    return settings


@pytest.fixture(autouse=True)
def mock_ocw_learning_bucket(ocw_aws_settings):
    """Mock OCW learning bucket"""
    with mock_s3():
        s3 = boto3.resource(
            "s3",
            aws_access_key_id=ocw_aws_settings.OCW_LEARNING_COURSE_ACCESS_KEY,
            aws_secret_access_key=ocw_aws_settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
        )
        bucket = s3.create_bucket(
            Bucket=ocw_aws_settings.OCW_LEARNING_COURSE_BUCKET_NAME
        )
        yield SimpleNamespace(s3=s3, bucket=bucket)
