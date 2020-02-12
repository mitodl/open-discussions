"""OCW ETL tests"""
# pylint: disable=redefined-outer-name
import json
from types import SimpleNamespace

import pytest

from course_catalog.constants import (
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_PAGE,
    VALID_TEXT_FILE_TYPES,
)
from course_catalog.etl.ocw import (
    upload_mitx_course_manifest,
    transform_content_files,
    get_content_file_url,
    transform_content_file,
)

OCW_COURSE_JSON = {
    "uid": "0007de9b4a0cd7c298d822b4123c2eaf",
    "title": "Geometric Disciplines and Architecture Skills: Reciprocal Methodologies",
    "url": "/courses/engineering/4-105-geometric-disciplines-fall-2012",
    "short_url": "4-105-geometric-disciplines-fall-2012",
    "course_files": [
        {
            "uid": "e07fcb22fbcf24329fc81b8194329699",
            "parent_uid": "bb5f9d523e26f2a622f728050421f5a7",
            "title": "Exercise 3: Thickened Plane + the Explosion",
            "caption": None,
            "file_type": "application/pdf",
            "alt_text": None,
            "credit": None,
            "platform_requirements": "Adobe Reader software is required to view this .pdf file.",
            "description": "This resource contains information regarding thickened plane + the explosion.",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "e07fcb22fbcf24329fc81b8194329699_MIT4_105F12_ex3-explosion.pdf"
            ),
        },
        {
            "uid": "78a221020dc9604e6608d57f2a6b6fd0",
            "parent_uid": "bb5f9d523e26f2a622f728050421f5a7",
            "title": "ex6-handle.3dm",
            "caption": None,
            "file_type": "application/octet-stream",
            "alt_text": None,
            "credit": None,
            "platform_requirements": "3DM Viewer is required to run .3dm files",
            "description": "This resource is related to rhino\u00ae model: handle.",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "78a221020dc9604e6608d57f2a6b6fd0_ex6-handle.3dm"
            ),
        },
    ],
    "course_foreign_files": [
        {
            "parent_uid": "bb5f9d523e26f2a622f728050421f5a7",
            "link": "http://ocw.mit.edu/ans7870/4/4.105/f12/MIT4_105F12_lec1-intro.pdf",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "MIT4_105F12_lec1-intro.pdf"
            ),
        },
        {
            "parent_uid": "bb5f9d523e26f2a622f728050421f5a7",
            "link": "http://ocw.mit.edu/ans7870/4/4.105/f12/MIT4_105F12_lec7-discret.pdf",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "MIT4_105F12_lec7-discret.pdf"
            ),
        },
    ],
    "course_pages": [
        {
            "uid": "bb5f9d523e26f2a622f728050421f5a7",
            "parent_uid": "0007de9b4a0cd7c298d822b4123c2eaf",
            "title": "Assignments",
            "text": "<p>The following are the assigned exercises",
            "url": "/courses/architecture/4-105-geometric-disciplines-fall-2012/assignments",
            "short_url": "assignments",
            "description": "This section provides the assigned exercises for the course",
            "type": "CourseSection",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "bb5f9d523e26f2a622f728050421f5a7.html"
            ),
        }
    ],
}


@pytest.fixture
def mock_tika_functions(mocker):
    """ Mock tika-related functions"""
    mock_extract_text = mocker.patch(
        "course_catalog.etl.ocw.extract_text_metadata",
        return_value={
            "metadata": {
                "Author": "Test Author",
                "language": "en",
                "title": "Test Title",
            },
            "content": "Test content",
        },
    )
    mock_sync_s3_text = mocker.patch("course_catalog.etl.ocw.sync_s3_text")
    yield SimpleNamespace(
        mock_extract_text=mock_extract_text, mock_sync_text=mock_sync_s3_text
    )


@pytest.fixture(autouse=True)
def mock_s3_content(mock_ocw_learning_bucket):
    """Set up the fake s3 data"""
    # Add data to the bucket
    for file in (
        OCW_COURSE_JSON["course_files"] + OCW_COURSE_JSON["course_foreign_files"]
    ):
        file_key = file["file_location"].replace("https://s3.amazonaws.com/", "")
        mock_ocw_learning_bucket.bucket.put_object(Key=file_key, Body=b"fake text")
    for page in OCW_COURSE_JSON["course_pages"]:
        file_key = f"{OCW_COURSE_JSON['short_url']}/{page['uid']}.html"
        mock_ocw_learning_bucket.bucket.put_object(Key=file_key, Body=b"fake html")


@pytest.mark.django_db
def test_transform_content_files(mock_tika_functions):
    """ Verify that transform_content_files calls tika and returns expected output """
    file_inputs = (
        OCW_COURSE_JSON["course_files"] + OCW_COURSE_JSON["course_foreign_files"]
    )
    page_inputs = OCW_COURSE_JSON["course_pages"]
    text_inputs = [
        input
        for input in (file_inputs + page_inputs)
        if input["file_location"].split(".")[-1] in VALID_TEXT_FILE_TYPES
    ]
    all_inputs = [(file, CONTENT_TYPE_FILE) for file in file_inputs] + [
        (page, CONTENT_TYPE_PAGE) for page in page_inputs
    ]

    transformed_files = transform_content_files(OCW_COURSE_JSON)
    assert len(transformed_files) == len(all_inputs)
    assert mock_tika_functions.mock_extract_text.call_count == len(text_inputs)
    assert mock_tika_functions.mock_sync_text.call_count == len(text_inputs)

    assert transformed_files == [
        transform_content_file(OCW_COURSE_JSON, file, ftype)
        for (file, ftype) in all_inputs
    ]


@pytest.mark.django_db
def test_transform_content_file_course_files(mock_tika_functions):
    """ Test that contents of course_files are transformed correctly """
    for course_file in OCW_COURSE_JSON["course_files"]:
        expected_transform = {
            "content_type": CONTENT_TYPE_FILE,
            "description": course_file["description"],
            "file_type": course_file["file_type"],
            "key": course_file["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": OCW_COURSE_JSON["course_pages"][0]["title"],
            "title": course_file["title"],
            "uid": course_file.get("uid", None),
            "url": get_content_file_url(
                OCW_COURSE_JSON, course_file, CONTENT_TYPE_FILE
            ),
        }
        if course_file["file_location"].split(".")[-1] in VALID_TEXT_FILE_TYPES:
            expected_transform.update(
                {
                    "content": mock_tika_functions.mock_extract_text.return_value[
                        "content"
                    ],
                    "content_author": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ][
                        "Author"
                    ],
                    "content_language": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ][
                        "language"
                    ],
                    "content_title": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ]["title"],
                }
            )
        assert (
            transform_content_file(OCW_COURSE_JSON, course_file, CONTENT_TYPE_FILE)
            == expected_transform
        )


@pytest.mark.django_db
def test_transform_content_file_course_foreign_files(mock_tika_functions):
    """ Test that contents of course_foreign_files are transformed correctly """
    for course_file in OCW_COURSE_JSON["course_foreign_files"]:
        expected_transform = {
            "content_type": CONTENT_TYPE_FILE,
            "file_type": None,
            "key": course_file["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": OCW_COURSE_JSON["course_pages"][0]["title"],
            "url": get_content_file_url(
                OCW_COURSE_JSON, course_file, CONTENT_TYPE_FILE
            ),
        }
        if course_file["file_location"].split(".")[-1] in VALID_TEXT_FILE_TYPES:
            expected_transform.update(
                {
                    "content": mock_tika_functions.mock_extract_text.return_value[
                        "content"
                    ],
                    "content_author": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ][
                        "Author"
                    ],
                    "content_language": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ][
                        "language"
                    ],
                    "content_title": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ]["title"],
                }
            )
        assert (
            transform_content_file(OCW_COURSE_JSON, course_file, CONTENT_TYPE_FILE)
            == expected_transform
        )


@pytest.mark.django_db
def test_transform_content_file_course_pages(mock_tika_functions):
    """ Test that contents of course_pages are transformed correctly """
    for course_page in OCW_COURSE_JSON["course_pages"]:
        expected_transform = {
            "content_type": CONTENT_TYPE_PAGE,
            "description": course_page["description"],
            "file_type": course_page["type"],
            "key": course_page["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": course_page["title"],
            "title": course_page["title"],
            "uid": course_page["uid"],
            "url": get_content_file_url(
                OCW_COURSE_JSON, course_page, CONTENT_TYPE_PAGE
            ),
            "short_url": course_page["short_url"],
        }
        if course_page["file_location"].split(".")[-1] in VALID_TEXT_FILE_TYPES:
            expected_transform.update(
                {
                    "content": mock_tika_functions.mock_extract_text.return_value[
                        "content"
                    ],
                    "content_author": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ][
                        "Author"
                    ],
                    "content_language": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ][
                        "language"
                    ],
                    "content_title": mock_tika_functions.mock_extract_text.return_value[
                        "metadata"
                    ]["title"],
                }
            )
        assert (
            transform_content_file(OCW_COURSE_JSON, course_page, CONTENT_TYPE_PAGE)
            == expected_transform
        )


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
