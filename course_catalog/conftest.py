"""Common fixtures for course_catalog"""
from os import listdir
from os.path import isfile, join
from types import SimpleNamespace

import boto3
import pytest

TEST_PREFIX = "PROD/9/9.15/Fall_2007/9-15-biochemistry-and-pharmacology-of-synaptic-transmission-fall-2007/"

TEST_JSON_PATH = f"./test_json/{TEST_PREFIX}0"
TEST_JSON_FILES = [
    f for f in listdir(TEST_JSON_PATH) if isfile(join(TEST_JSON_PATH, f))
]


@pytest.fixture
def mock_course_index_functions(mocker):
    """Mocks index updating functions for courses"""
    return SimpleNamespace(
        upsert_course=mocker.patch("course_catalog.api.upsert_course")
    )


def setup_s3(settings):
    """
    Set up the fake s3 data
    """
    # Fake the settings
    settings.AWS_ACCESS_KEY_ID = "abc"
    settings.AWS_SECRET_ACCESS_KEY = "abc"
    settings.OCW_CONTENT_BUCKET_NAME = "test_bucket"
    settings.OCW_LEARNING_COURSE_BUCKET_NAME = "testbucket2"
    # Create our fake bucket
    conn = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
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
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    conn.create_bucket(Bucket=settings.OCW_LEARNING_COURSE_BUCKET_NAME)
