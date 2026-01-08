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
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_PAGE,
    CONTENT_TYPE_VIDEO,
    VALID_TEXT_FILE_TYPES,
)
from course_catalog.etl.ocw import (
    EXCLUDED_CONTENT_FILE_TYPES,
    get_content_file_section,
    get_content_file_url,
    get_content_type,
    transform_content_file,
    transform_content_files,
    transform_embedded_media,
    upload_mitx_course_manifest,
)
from course_catalog.factories import VideoFactory

with open("./test_json/test_ocw_parsed.json") as f:
    OCW_COURSE_JSON = json.load(f)

COURSE_PAGES = OCW_COURSE_JSON["course_pages"]
COURSE_FILES = OCW_COURSE_JSON["course_files"]
FOREIGN_FILES = OCW_COURSE_JSON["course_foreign_files"]
EMBEDDED_MEDIA = OCW_COURSE_JSON["course_embedded_media"]


@pytest.fixture
def mock_tika_functions(mocker):
    """Mock tika-related functions"""
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
    return SimpleNamespace(
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
    """Verify that transform_content_files calls tika and returns expected output"""
    mock_exception_log = mocker.patch("course_catalog.etl.ocw.log.exception")
    mocker.patch(
        "course_catalog.etl.ocw.extract_text_from_url", return_value="tika text"
    )

    included_pages = list(
        filter(
            lambda file: file.get("type") not in EXCLUDED_CONTENT_FILE_TYPES,
            COURSE_PAGES,
        )
    )
    file_inputs = COURSE_FILES + FOREIGN_FILES
    text_inputs = [
        input
        for input in (file_inputs + included_pages)
        if splitext(input["file_location"])[-1] in VALID_TEXT_FILE_TYPES
    ]
    all_inputs = [(file, False) for file in file_inputs] + [
        (page, True) for page in included_pages
    ]
    youtube_inputs = [EMBEDDED_MEDIA[item] for item in EMBEDDED_MEDIA]

    transformed_files = list(transform_content_files(OCW_COURSE_JSON))
    assert len(transformed_files) == len(all_inputs) + len(youtube_inputs) - 1
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

    transformed_files = list(transformed_files)

    assert transformed_files == [
        transform_content_file(OCW_COURSE_JSON, file, is_page=is_page)
        for (file, is_page) in all_inputs
    ] + [
        transform_embedded_media(EMBEDDED_MEDIA, media) for media in youtube_inputs[:-1]
    ]
    mock_exception_log.assert_not_called()


@pytest.mark.django_db
def test_transform_content_files_error(mocker):
    """Verify that errors are logged when transforming content files"""
    mocker.patch("course_catalog.etl.ocw.transform_content_file", side_effect=Exception)
    mocker.patch(
        "course_catalog.etl.ocw.transform_embedded_media", side_effect=Exception
    )
    mock_error_log = mocker.patch("course_catalog.etl.ocw.log.error")
    list(transform_content_files(OCW_COURSE_JSON))

    for course_file in COURSE_FILES:
        mock_error_log.assert_any_call(
            "ERROR syncing course file %s for run %s",
            course_file.get("uid", ""),
            OCW_COURSE_JSON.get("uid", ""),
            exc_info=True,
        )

    included_pages = filter(
        lambda file: file["type"] not in EXCLUDED_CONTENT_FILE_TYPES, COURSE_PAGES
    )
    for course_page in included_pages:
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
    """Verify that ex eptions are logged when extracting text from content files"""
    mocker.patch("course_catalog.etl.ocw.extract_text_metadata", side_effect=Exception)
    mock_exception_log = mocker.patch("course_catalog.etl.ocw.log.exception")
    list(transform_content_files(OCW_COURSE_JSON))

    mock_exception_log.assert_any_call(
        "Error extracting text from key %s for course run %s",
        "4-105-geometric-disciplines-fall-2012/e07fcb22fbcf24329fc81b8194329699_MIT4_105F12_ex3-explosion.pdf",
        "0007de9b4a0cd7c298d822b4123c2eaf",
    )

    included_pages = filter(
        lambda file: file["type"] not in EXCLUDED_CONTENT_FILE_TYPES, COURSE_PAGES
    )

    for course_page in included_pages:
        mock_exception_log.assert_any_call(
            "Error extracting text from key %s for course run %s",
            urlparse(course_page.get("file_location")).path.lstrip("/"),
            OCW_COURSE_JSON.get("uid", ""),
        )


@pytest.mark.django_db
def test_transform_content_files_generic_no_s3_key(
    mocker, mock_tika_functions, mock_ocw_learning_bucket
):
    """Verify that transform_content_files calls tika and returns expected output"""
    mock_warn_log = mocker.patch("course_catalog.etl.ocw.log.warning")
    bad_key = "4-105-geometric-disciplines-fall-2012/e07fcb22fbcf24329fc81b8194329699_MIT4_105F12_ex3-explosion.pdf"

    mock_ocw_learning_bucket.bucket.delete_objects(
        Delete={"Objects": [{"Key": bad_key}], "Quiet": True}
    )
    list(transform_content_files(OCW_COURSE_JSON))

    mock_warn_log.assert_any_call(
        "No S3 object found for %s in course run %s",
        bad_key,
        "0007de9b4a0cd7c298d822b4123c2eaf",
    )


@pytest.mark.django_db
def test_transform_content_file_course_files(mock_tika_functions):
    """Test that contents of course_files are transformed correctly"""
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
            "published": True,
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
    """Test that contents of course_foreign_files are transformed correctly"""
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
            "published": True,
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
    """Test that contents of course_pages are transformed correctly"""
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
            "published": True,
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
    """Test that contents of embedded media are transformed correctly"""
    mocker.patch(
        "course_catalog.etl.ocw.extract_text_from_url", return_value=url_response
    )
    for item in EMBEDDED_MEDIA:
        if EMBEDDED_MEDIA[item]["embedded_media"][0]["id"] == "Video-YouTube-Stream":
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
            elif len(EMBEDDED_MEDIA[item]["embedded_media"]) >= 3:
                expected_content = url_response
            else:
                expected_content = None
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
                "published": True,
            }
        else:
            expected_transform = None
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
    """Test that correct URL's are returned"""
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
