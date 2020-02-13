"""OCW ETL tests"""
# pylint: disable=redefined-outer-name
import json
from types import SimpleNamespace
from urllib.parse import urljoin

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
    get_content_file_section,
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
            "description": "This resource is related to rhino\u00ae model: handle.",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "78a221020dc9604e6608d57f2a6b6fd0_ex6-handle.3dm"
            ),
        },
        {
            "uid": "98a221020dc9604e6608d57f2a6b6fd1",
            "title": "testing.pdf",
            "caption": None,
            "file_type": "application/octet-stream",
            "description": "A test file",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "98a221020dc9604e6608d57f2a6b6fd1_testing.pdf"
            ),
        },
        {
            "uid": "00a221020dc9604e6608d57f2a6b6f11",
            "parent_uid": "0b5f9d523e26f2a622f728050421f5a9",
            "title": "testing2.pdf",
            "caption": None,
            "file_type": "application/octet-stream",
            "description": "A test file 2",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "00a221020dc9604e6608d57f2a6b6f11_testing2.pdf"
            ),
        },
        {
            "uid": "450555028099b6c7beac2e1a39e5cede",
            "parent_uid": "aa5f9d523e26f2a622f728050421f5zz",
            "title": "ex7_lz_300k.mp4",
            "caption": None,
            "file_type": "application/octet-stream",
            "description": "Video",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "450555028099b6c7beac2e1a39e5cede_ex7_lz_300k.mp4"
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
    "course_embedded_media": {
        "20547250exercise7video:inflation": {
            "embedded_media": [
                {
                    "uid": "450555028099b6c7beac2e1a39e5cede",
                    "parent_uid": "37930e14299c238ef9667d294207cc33",
                    "id": "Video-YouTube-Stream",
                    "title": "Video-YouTube-Stream",
                    "media_info": "http://www.archive.org/download/ex7_lz_300k.mp4",
                }
            ]
        }
    },
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
        },
        {
            "uid": "0b5f9d523e26f2a622f728050421f5a9",
            "title": "Sectionless Page",
            "text": "<p>The Sectionless Page</p>",
            "url": "/courses/architecture/4-105-geometric-disciplines-fall-2012/",
            "short_url": "",
            "description": "Extra Page",
            "type": "SomethingElse",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "bb5f9d523e26f2a622f728050421f5a7_extra.html"
            ),
        },
    ],
}

COURSE_PAGES = OCW_COURSE_JSON["course_pages"]
COURSE_FILES = OCW_COURSE_JSON["course_files"]
FOREIGN_FILES = OCW_COURSE_JSON["course_foreign_files"]


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
    for file in COURSE_FILES + FOREIGN_FILES:
        mock_ocw_learning_bucket.bucket.put_object(
            Key=file["file_location"].replace("https://s3.amazonaws.com/", ""),
            Body=b"fake text",
        )
    for page in COURSE_PAGES:
        mock_ocw_learning_bucket.bucket.put_object(
            Key=page["file_location"].replace("https://s3.amazonaws.com/", ""),
            Body=b"fake html",
        )


@pytest.mark.django_db
def test_transform_content_files(mock_tika_functions):
    """ Verify that transform_content_files calls tika and returns expected output """
    file_inputs = COURSE_FILES + FOREIGN_FILES
    text_inputs = [
        input
        for input in (file_inputs + COURSE_PAGES)
        if input["file_location"].split(".")[-1] in VALID_TEXT_FILE_TYPES
    ]
    all_inputs = [(file, CONTENT_TYPE_FILE) for file in file_inputs] + [
        (page, CONTENT_TYPE_PAGE) for page in COURSE_PAGES
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
def test_transform_content_files_bad_course_file(mocker):
    """ Verify that transform_content_files calls tika and returns expected output """
    mocker.patch("course_catalog.etl.ocw.transform_content_file", side_effect=Exception)
    mock_log = mocker.patch("course_catalog.etl.ocw.log.error")
    transform_content_files(OCW_COURSE_JSON)
    for course_file in COURSE_FILES:
        mock_log.assert_any_call(
            "ERROR syncing course file %s for run %s",
            course_file.get("uid", ""),
            OCW_COURSE_JSON.get("uid", ""),
            exc_info=True,
        )
    for course_page in COURSE_PAGES:
        mock_log.assert_any_call(
            "ERROR syncing course page %s for run %s",
            course_page.get("uid", ""),
            OCW_COURSE_JSON.get("uid", ""),
            exc_info=True,
        )


@pytest.mark.django_db
def test_transform_content_file_course_files(mock_tika_functions):
    """ Test that contents of course_files are transformed correctly """
    for course_file in COURSE_FILES:
        expected_transform = {
            "content_type": CONTENT_TYPE_FILE,
            "description": course_file["description"],
            "file_type": course_file["file_type"],
            "key": course_file["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": get_content_file_section(course_file, COURSE_PAGES),
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
    for course_file in FOREIGN_FILES:
        expected_transform = {
            "content_type": CONTENT_TYPE_FILE,
            "file_type": None,
            "key": course_file["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": get_content_file_section(course_file, COURSE_PAGES),
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
    for course_page in COURSE_PAGES:
        expected_transform = {
            "content_type": CONTENT_TYPE_PAGE,
            "description": course_page["description"],
            "file_type": course_page["type"],
            "key": course_page["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": get_content_file_section(course_page, COURSE_PAGES),
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


def test_get_content_file_section():
    """Test that the correct section for a content file is returned"""
    # Matching parent_uid page
    assert (
        get_content_file_section(COURSE_FILES[0], COURSE_PAGES)
        == COURSE_PAGES[0]["title"]
    )
    # No parent_uid
    assert get_content_file_section(COURSE_FILES[2], COURSE_PAGES) is None
    # parent page has no section
    assert get_content_file_section(COURSE_FILES[3], COURSE_PAGES) is None
    # page has section
    assert (
        get_content_file_section(COURSE_PAGES[0], COURSE_PAGES)
        == COURSE_PAGES[0]["title"]
    )
    # page has no section
    assert get_content_file_section(COURSE_PAGES[1], COURSE_PAGES) is None


def test_get_content_file_url(settings):
    """ Test that correct URL's are returned """
    settings.OCW_BASE_URL = "http://ocw.mit.edu"

    for page in COURSE_PAGES:
        assert (
            get_content_file_url(OCW_COURSE_JSON, page, CONTENT_TYPE_PAGE)
            == f"{settings.OCW_BASE_URL}{page.get('url', '')}"
        )

    # File with a parent page
    assert get_content_file_url(
        OCW_COURSE_JSON, COURSE_FILES[0], CONTENT_TYPE_FILE
    ) == urljoin(
        settings.OCW_BASE_URL,
        f"{OCW_COURSE_JSON['url']}/{COURSE_PAGES[0]['short_url']}/MIT4_105F12_ex3-explosion.pdf",
    )

    # File without a parent page
    assert (
        get_content_file_url(OCW_COURSE_JSON, COURSE_FILES[2], CONTENT_TYPE_FILE)
        == COURSE_FILES[2]["file_location"]
    )

    # File with a media_info match
    assert (
        get_content_file_url(OCW_COURSE_JSON, COURSE_FILES[4], CONTENT_TYPE_FILE)
        == "http://www.archive.org/download/ex7_lz_300k.mp4"
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
