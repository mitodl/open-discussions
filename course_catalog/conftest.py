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

OCW_NEXT_TEST_PREFIX = (
    "courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/"
)

OCW_NEXT_TEST_JSON_PATH = join("./test_json/", OCW_NEXT_TEST_PREFIX[:-1])


@pytest.fixture
def mock_course_index_functions(mocker):
    """Mocks index updating functions for courses"""
    return SimpleNamespace(
        upsert_course=mocker.patch("course_catalog.api.upsert_course")
    )


@pytest.fixture
def ocw_next_valid_data():
    """Return valid ocw-next data"""
    return {
        "course_title": "Unified Engineering I, II, III, & IV",
        "course_description": "The basic objective of Unified Engineering is to give a solid understanding of the fundamental disciplines of aerospace engineering, as well as their interrelationships and applications. These disciplines are Materials and Structures (M); Computers and Programming (C); Fluid Mechanics (F); Thermodynamics (T); Propulsion (P); and Signals and Systems (S). In choosing to teach these subjects in a unified manner, the instructors seek to explain the common intellectual threads in these disciplines, as well as their combined application to solve engineering Systems Problems (SP). Throughout the year, the instructors emphasize the connections among the disciplines",
        "site_uid": None,
        "legacy_uid": "97db384e-f340-09a6-4df7-cb86cf701979",
        "instructors": [
            {
                "first_name": "Mark",
                "last_name": "Drela",
                "middle_initial": "",
                "salutation": "Prof.",
                "title": "Prof. Mark Drela",
            },
            {
                "first_name": "Steven",
                "last_name": "Hall",
                "middle_initial": "",
                "salutation": "Prof.",
                "title": "Prof. Steven Hall",
            },
        ],
        "department_numbers": ["16"],
        "learning_resource_types": [
            "Lecture Videos",
            "Course Introduction",
            "Competition Videos",
            "Problem Sets with Solutions",
            "Exams with Solutions",
        ],
        "topics": [
            ["Engineering", "Aerospace Engineering", "Materials Selection"],
            ["Engineering", "Aerospace Engineering", "Propulsion Systems"],
            ["Science", "Physics", "Thermodynamics"],
            ["Engineering", "Mechanical Engineering", "Fluid Mechanics"],
            ["Engineering", "Aerospace Engineering"],
            ["Business", "Project Management"],
        ],
        "primary_course_number": "16.01",
        "extra_course_numbers": "16.02, 16.03, 16.04, 17.01",
        "term": "Fall",
        "year": "2005",
        "level": ["Undergraduate"],
        "image_src": "https://open-learning-course-data-production.s3.amazonaws.com/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/8f56bbb35d0e456dc8b70911bec7cd0d_16-01f05.jpg",
        "course_image_metadata": {
            "description": "An abstracted aircraft wing with illustrated systems. (Image by MIT OCW.)",
            "draft": False,
            "file": "https://open-learning-course-data-production.s3.amazonaws.com/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/8f56bbb35d0e456dc8b70911bec7cd0d_16-01f05.jpg",
            "file_type": "image/jpeg",
            "image_metadata": {
                "caption": "An abstracted aircraft wing, illustrating the connections between the disciplines of Unified Engineering. (Image by MIT OpenCourseWare.)",
                "credit": "",
                "image-alt": "Illustration of an aircraft wing showing connections between the disciplines of the course.",
            },
            "iscjklanguage": False,
            "resourcetype": "Image",
            "title": "16-01f05.jpg",
            "uid": "8f56bbb3-5d0e-456d-c8b7-0911bec7cd0d",
        },
    }


def setup_s3(settings):
    """Set up the fake s3 data"""
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
        with open(TEST_JSON_PATH + "/" + file) as f:
            test_bucket.put_object(Key=file_key, Body=f.read())

    # Create our upload bucket
    conn = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    conn.create_bucket(Bucket=settings.OCW_LEARNING_COURSE_BUCKET_NAME)


def setup_s3_ocw_next(settings):
    """Set up the fake s3 data"""
    # Fake the settings
    settings.AWS_ACCESS_KEY_ID = "abc"
    settings.AWS_SECRET_ACCESS_KEY = "abc"
    settings.OCW_NEXT_LIVE_BUCKET = "test_bucket"
    settings.OCW_NEXT_AWS_STORAGE_BUCKET_NAME = "test_bucket"
    # Create our fake bucket
    conn = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    conn.create_bucket(Bucket=settings.OCW_NEXT_LIVE_BUCKET)

    # Add data to the fake ocw next bucket
    ocw_next_bucket = conn.Bucket(name=settings.OCW_NEXT_LIVE_BUCKET)

    base_folder = OCW_NEXT_TEST_JSON_PATH.replace("./test_json/", "")

    for file in listdir(OCW_NEXT_TEST_JSON_PATH):
        add_file_to_bucket_recursive(
            ocw_next_bucket, OCW_NEXT_TEST_JSON_PATH, base_folder, file
        )


def add_file_to_bucket_recursive(bucket, file_base, s3_base, file_object):
    """Add file to fake s3 bucket"""
    local_path = file_base + "/" + file_object
    file_key = s3_base + "/" + file_object

    if file_object[0] == ".":
        return

    if isfile(join(file_base, file_object)):
        with open(local_path) as f:
            bucket.put_object(Key=file_key, Body=f.read())
    else:
        for child in listdir(local_path):
            add_file_to_bucket_recursive(bucket, local_path, file_key, child)
