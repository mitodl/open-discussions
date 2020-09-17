"""OCW ETL tests"""
# pylint: disable=redefined-outer-name,too-many-function-args
import json
import mimetypes
from os.path import splitext
from types import SimpleNamespace
from urllib.parse import urlparse

import pytest
from bs4 import BeautifulSoup as bs

from course_catalog.constants import (
    CONTENT_TYPE_PAGE,
    VALID_TEXT_FILE_TYPES,
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_VIDEO,
)
from course_catalog.etl.ocw import (
    upload_mitx_course_manifest,
    transform_content_files,
    get_content_file_url,
    transform_content_file,
    get_content_file_section,
    get_content_type,
    transform_embedded_media,
)
from course_catalog.factories import VideoFactory

OCW_COURSE_JSON = {
    "uid": "0007de9b4a0cd7c298d822b4123c2eaf",
    "title": "Geometric Disciplines and Architecture Skills: Reciprocal Methodologies",
    "url": "/courses/engineering/4-105-geometric-disciplines-fall-2012",
    "short_url": "4-105-geometric-disciplines-fall-2012",
    "department_number": "4",
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
            "file_type": "application/pdf",
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
            "file_type": "video/mp4",
            "description": "Video",
            "file_location": (
                "https://s3.amazonaws.com/4-105-geometric-disciplines-fall-2012/"
                + "450555028099b6c7beac2e1a39e5cede_ex7_lz_300k.mp4"
            ),
        },
    ],
    "course_foreign_files": [
        {
            "parent_uid": "zz5f9d523e26f2a622f728050421f5a7",
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
        "21997335lecture81445932": {
            "uid": "e5501acc33e7f9f384814753f8c22805",
            "title": "Lecture 8: Our Passion for Entrepreneurship at MIT",
            "transcript": "<p>This is the <span>video transcript</span></p>",
            "embedded_media": [
                {
                    "id": "Video-YouTube-Stream",
                    "uid": "44d0bedab30fbef83e08e4ed3e7f6e89",
                    "type": "Video",
                    "title": "Video-YouTube-Stream",
                    "parent_uid": "e5501acc33e7f9f384814753f8c22805",
                    "media_location": "Ma3ANiGPVNU",
                },
                {
                    "id": "Thumbnail-YouTube-JPG",
                    "uid": "d4fe5673876abb039d32308dae32f57d",
                    "type": "Thumbnail",
                    "title": "Thumbnail-YouTube-JPG",
                    "parent_uid": "e5501acc33e7f9f384814753f8c22805",
                    "media_location": "https://img.youtube.com/vi/Ma3ANiGPVNU/default.jpg",
                },
                {
                    "id": "Ma3ANiGPVNU.pdf",
                    "uid": "023ec58f4ead6e6c219ed2645e93e3df",
                    "type": None,
                    "title": "3play pdf file",
                    "parent_uid": "e5501acc33e7f9f384814753f8c22805",
                    "technical_location": "https://ocw.mit.edu/courses/15-3/video-tutorials/Ma3ANiGPVNU.pdf",
                },
            ],
        },
        "31997335lecture81445932": {
            "uid": "e5501acc33e7f9f384814753f8c22805",
            "title": "Lecture 9: Our Passion for Tech at MIT",
            "transcript": "",
            "embedded_media": [
                {
                    "id": "Video-YouTube-Stream",
                    "uid": "54d0bedab30fbef83e08e4ed3e7f6e89",
                    "type": "Video",
                    "title": "Video-YouTube-Stream",
                    "parent_uid": "f5501acc33e7f9f384814753f8c22805",
                    "media_location": "MGPVNUa3ANi",
                },
                {
                    "id": "Thumbnail-YouTube-JPG",
                    "uid": "f4fe5673876abb039d32308dae32f57d",
                    "type": "Thumbnail",
                    "title": "Thumbnail-YouTube-JPG",
                    "parent_uid": "e5501acc33e7f9f384814753f8c22805",
                    "media_location": "https://img.youtube.com/vi/MGPVNUa3ANi/default.jpg",
                },
                {
                    "id": "MGPVNUa3ANi.pdf",
                    "uid": "123ec58f4ead6e6c219ed2645e93e3df",
                    "type": None,
                    "title": "3play pdf file",
                    "parent_uid": "e5501acc33e7f9f384814753f8c22805",
                    "technical_location": "https://ocw.mit.edu/courses/15-3/MGPVNUa3ANi.pdf",
                },
            ],
        },
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
            "parent_uid": "bb5f9d523e26f2a622f728050421f5a7",
            "title": "Sub Page",
            "text": "<p>The Sub Page</p>",
            "url": "/courses/architecture/4-105-geometric-disciplines-fall-2012/",
            "short_url": "",
            "description": "Extra Page",
            "type": "DownloadsSection",
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
EMBEDDED_MEDIA = OCW_COURSE_JSON["course_embedded_media"]


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
def test_transform_content_files(mock_tika_functions, mocker):
    """ Verify that transform_content_files calls tika and returns expected output """
    mock_exception_log = mocker.patch("course_catalog.etl.ocw.log.exception")
    mocker.patch(
        "course_catalog.etl.ocw.extract_text_from_url", return_value="tika text"
    )
    file_inputs = COURSE_FILES + FOREIGN_FILES
    text_inputs = [
        input
        for input in (file_inputs + COURSE_PAGES)
        if splitext(input["file_location"])[-1] in VALID_TEXT_FILE_TYPES
    ]
    all_inputs = [(file, False) for file in file_inputs] + [
        (page, True) for page in COURSE_PAGES
    ]
    youtube_inputs = [EMBEDDED_MEDIA[item] for item in EMBEDDED_MEDIA]

    transformed_files = transform_content_files(OCW_COURSE_JSON)
    assert len(transformed_files) == len(all_inputs) + len(youtube_inputs)
    assert mock_tika_functions.mock_extract_text.call_count == len(text_inputs)
    mock_tika_functions.mock_extract_text.assert_any_call(
        mocker.ANY,
        other_headers={
            "Content-Type": mimetypes.types_map.get(
                splitext(file_inputs[0]["file_location"])[-1]
            )
        },
    )
    assert mock_tika_functions.mock_sync_text.call_count == len(text_inputs)

    assert transformed_files == [
        transform_content_file(OCW_COURSE_JSON, file, is_page=is_page)
        for (file, is_page) in all_inputs
    ] + [transform_embedded_media(EMBEDDED_MEDIA, media) for media in youtube_inputs]
    mock_exception_log.assert_not_called()


@pytest.mark.django_db
def test_transform_content_files_error(mocker):
    """ Verify that errors are logged when transforming content files """
    mocker.patch("course_catalog.etl.ocw.transform_content_file", side_effect=Exception)
    mocker.patch(
        "course_catalog.etl.ocw.transform_embedded_media", side_effect=Exception
    )
    mock_error_log = mocker.patch("course_catalog.etl.ocw.log.error")
    transform_content_files(OCW_COURSE_JSON)
    for course_file in COURSE_FILES:
        mock_error_log.assert_any_call(
            "ERROR syncing course file %s for run %s",
            course_file.get("uid", ""),
            OCW_COURSE_JSON.get("uid", ""),
            exc_info=True,
        )

    for course_page in COURSE_PAGES:
        mock_error_log.assert_any_call(
            "ERROR syncing course page %s for run %s",
            course_page.get("uid", ""),
            OCW_COURSE_JSON.get("uid", ""),
            exc_info=True,
        )
    for item in EMBEDDED_MEDIA:
        mock_error_log.assert_any_call(
            "ERROR syncing embed item %s for run %s",
            item,
            OCW_COURSE_JSON.get("uid", ""),
            exc_info=True,
        )


@pytest.mark.django_db
def test_transform_content_files_generic_s3_error(mocker):
    """ Verify that ex eptions are logged when extracting text from content files  """
    mocker.patch("course_catalog.etl.ocw.extract_text_metadata", side_effect=Exception)
    mock_exception_log = mocker.patch("course_catalog.etl.ocw.log.exception")
    transform_content_files(OCW_COURSE_JSON)

    mock_exception_log.assert_any_call(
        "Error extracting text from key %s for course run %s",
        "4-105-geometric-disciplines-fall-2012/e07fcb22fbcf24329fc81b8194329699_MIT4_105F12_ex3-explosion.pdf",
        "0007de9b4a0cd7c298d822b4123c2eaf",
    )

    for course_page in COURSE_PAGES:
        mock_exception_log.assert_any_call(
            "Error extracting text from key %s for course run %s",
            urlparse(course_page.get("file_location")).path.lstrip("/"),
            OCW_COURSE_JSON.get("uid", ""),
        )


@pytest.mark.django_db
def test_transform_content_files_generic_no_s3_key(mocker, mock_ocw_learning_bucket):
    """ Verify that transform_content_files calls tika and returns expected output """
    mock_warn_log = mocker.patch("course_catalog.etl.ocw.log.warning")
    bad_key = "4-105-geometric-disciplines-fall-2012/e07fcb22fbcf24329fc81b8194329699_MIT4_105F12_ex3-explosion.pdf"

    mock_ocw_learning_bucket.bucket.delete_objects(
        Delete={"Objects": [{"Key": bad_key}], "Quiet": True}
    )
    transform_content_files(OCW_COURSE_JSON)

    mock_warn_log.assert_any_call(
        "No S3 object found for %s in course run %s",
        bad_key,
        "0007de9b4a0cd7c298d822b4123c2eaf",
    )


@pytest.mark.django_db
def test_transform_content_file_course_files(mock_tika_functions):
    """ Test that contents of course_files are transformed correctly """
    for course_file in COURSE_FILES:
        (section, section_slug) = get_content_file_section(course_file, COURSE_PAGES)
        expected_transform = {
            "file_type": course_file["file_type"],
            "content_type": get_content_type(course_file["file_type"]),
            "description": course_file["description"],
            "key": course_file["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": section,
            "section_slug": section_slug,
            "title": course_file["title"],
            "uid": course_file.get("uid", None),
            "url": get_content_file_url(course_file, is_page=False),
        }
        if splitext(course_file["file_location"])[-1] in VALID_TEXT_FILE_TYPES:
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
            transform_content_file(OCW_COURSE_JSON, course_file, is_page=False)
            == expected_transform
        )


@pytest.mark.django_db
def test_transform_content_file_course_foreign_files(mock_tika_functions):
    """ Test that contents of course_foreign_files are transformed correctly """
    for course_file in FOREIGN_FILES:
        (section, section_slug) = get_content_file_section(course_file, COURSE_PAGES)
        expected_transform = {
            "file_type": None,
            "content_type": CONTENT_TYPE_FILE,
            "key": course_file["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": section,
            "section_slug": section_slug,
            "url": get_content_file_url(course_file, is_page=False),
        }
        if splitext(course_file["file_location"])[-1] in VALID_TEXT_FILE_TYPES:
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
            transform_content_file(OCW_COURSE_JSON, course_file, is_page=False)
            == expected_transform
        )


@pytest.mark.django_db
def test_transform_content_file_course_pages(mock_tika_functions):
    """ Test that contents of course_pages are transformed correctly """
    for course_page in COURSE_PAGES:
        (section, section_slug) = get_content_file_section(course_page, COURSE_PAGES)
        expected_transform = {
            "content_type": CONTENT_TYPE_PAGE,
            "description": course_page["description"],
            "file_type": course_page["type"],
            "key": course_page["file_location"].replace(
                "https://s3.amazonaws.com/", ""
            ),
            "section": section,
            "section_slug": section_slug,
            "title": course_page["title"],
            "uid": course_page["uid"],
            "url": get_content_file_url(course_page, is_page=True),
            "short_url": course_page["short_url"],
        }
        if splitext(course_page["file_location"])[-1] in VALID_TEXT_FILE_TYPES:
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
            transform_content_file(OCW_COURSE_JSON, course_page, is_page=True)
            == expected_transform
        )


@pytest.mark.django_db
@pytest.mark.parametrize("video_exists", [True, False])
@pytest.mark.parametrize("url_response", ["tika text", None])
def test_transform_embedded_media(mocker, video_exists, url_response):
    """ Test that contents of embedded media are transformed correctly """
    mocker.patch(
        "course_catalog.etl.ocw.extract_text_from_url", return_value=url_response
    )
    for item in EMBEDDED_MEDIA:
        (section, section_slug) = get_content_file_section(
            EMBEDDED_MEDIA[item], COURSE_PAGES
        )
        key = EMBEDDED_MEDIA[item]["embedded_media"][0]["media_location"]
        video = VideoFactory.create(video_id=key) if video_exists else None
        if video:
            expected_content = video.transcript
        elif EMBEDDED_MEDIA[item]["transcript"]:
            expected_content = bs(
                EMBEDDED_MEDIA[item]["transcript"], "html.parser"
            ).text
        else:
            expected_content = url_response
        expected_transform = {
            "content_type": CONTENT_TYPE_VIDEO,
            "file_type": "video/youtube",
            "key": key,
            "section": section,
            "section_slug": section_slug,
            "title": video.title if video else EMBEDDED_MEDIA[item]["title"],
            "uid": EMBEDDED_MEDIA[item]["uid"],
            "url": f"https://www.youtube.com/watch?v={key}",
            "image_src": video.image_src
            if video
            else EMBEDDED_MEDIA[item]["embedded_media"][1]["media_location"],
            "content": expected_content,
        }
        assert (
            transform_embedded_media(OCW_COURSE_JSON, EMBEDDED_MEDIA[item])
            == expected_transform
        )


def test_get_content_file_section():
    """Test that the correct section for a content file is returned"""
    # Matching parent_uid page
    assert get_content_file_section(COURSE_FILES[0], COURSE_PAGES) == (
        COURSE_PAGES[0]["title"],
        COURSE_PAGES[0]["short_url"],
    )
    assert get_content_file_section(COURSE_FILES[3], COURSE_PAGES) == (
        COURSE_PAGES[1]["title"],
        COURSE_PAGES[1]["short_url"],
    )

    # No parent_uid
    (section, slug) = get_content_file_section(COURSE_FILES[2], COURSE_PAGES)
    assert section is None
    assert slug is None

    # page has section
    assert get_content_file_section(COURSE_PAGES[0], COURSE_PAGES) == (
        COURSE_PAGES[0]["title"],
        None,
    )
    # page is a subsection of another page
    assert get_content_file_section(COURSE_PAGES[1], COURSE_PAGES) == (
        COURSE_PAGES[0]["title"],
        COURSE_PAGES[0]["short_url"],
    )


def test_get_content_file_url(settings):
    """ Test that correct URL's are returned """
    settings.OCW_BASE_URL = "http://ocw.mit.edu"

    for page in COURSE_PAGES:
        assert get_content_file_url(page, is_page=True) == page.get("url", "")

    # File with a parent page
    assert (
        get_content_file_url(COURSE_FILES[0], is_page=False)
        == COURSE_FILES[0]["file_location"]
    )

    # File without a parent page
    assert (
        get_content_file_url(COURSE_FILES[2], is_page=False)
        == COURSE_FILES[2]["file_location"]
    )

    assert (
        get_content_file_url(COURSE_FILES[4], is_page=False)
        == COURSE_FILES[4]["file_location"]
    )

    # Foreign file
    assert (
        get_content_file_url(FOREIGN_FILES[0], is_page=False)
        == FOREIGN_FILES[0]["link"]
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


@pytest.mark.parametrize("disabled_setting_name", ["OCW_LEARNING_COURSE_BUCKET_NAME"])
def test_upload_mitx_course_manifest_disabled(ocw_aws_settings, disabled_setting_name):
    """Test that upload_mitx_course_manifest doe not perform the upload is a setting is disabled"""
    # if this tries to hit S3 it will fail since the bucket doesn't exist in moto
    setattr(ocw_aws_settings, disabled_setting_name, None)
    assert upload_mitx_course_manifest([{"value": 1}]) is False


def test_upload_mitx_course_manifest_no_courses():
    """Test that upload_mitx_course_manifest doe not perform the upload if an empty course lists is passed"""
    # if this tries to hit S3 it will fail since the bucket doesn't exist in moto
    assert upload_mitx_course_manifest([]) is False
