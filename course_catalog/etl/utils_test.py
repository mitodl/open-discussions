"""ETL utils test"""
import datetime
import json
import os
import pathlib
from subprocess import check_call
from tempfile import TemporaryDirectory
from unittest.mock import ANY

import pytest
import pytz
from lxml import etree

from course_catalog.constants import (
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_VERTICAL,
    PlatformType,
)
from course_catalog.etl.utils import (
    documents_from_olx,
    extract_text_from_url,
    extract_text_metadata,
    extract_valid_department_from_id,
    generate_unique_id,
    get_learning_course_bucket,
    get_text_from_element,
    log_exceptions,
    map_topics,
    parse_dates,
    strip_extra_whitespace,
    sync_s3_text,
    transform_content_files,
)
from course_catalog.factories import ContentFileFactory, LearningResourceRunFactory

pytestmark = pytest.mark.django_db


def get_olx_test_docs():
    """Get a list of edx docs from a sample archive file"""
    script_dir = os.path.dirname(
        os.path.dirname(pathlib.Path(__file__).parent.absolute())
    )
    with TemporaryDirectory() as temp:
        check_call(
            [
                "tar",
                "xf",
                os.path.join(script_dir, "test_json", "exported_courses_12345.tar.gz"),
            ],
            cwd=temp,
        )
        check_call(["tar", "xf", "content-devops-0001.tar.gz"], cwd=temp)

        olx_path = os.path.join(temp, "content-devops-0001")
        return [doc for doc in documents_from_olx(olx_path)]


@pytest.mark.parametrize("side_effect", ["One", Exception("error")])
def test_log_exceptions(mocker, side_effect):
    """Test that log_exceptions executes the function and absorbs exceptions"""
    func = mocker.Mock(
        side_effect=side_effect
        if isinstance(side_effect, Exception)
        else lambda *args, **kwargs: side_effect
    )
    wrapped_func = log_exceptions("Error message", exc_return_value="Error Value")(func)
    mock_log = mocker.patch("course_catalog.etl.utils.log")

    result = wrapped_func(1, 2, val=3)

    if isinstance(side_effect, Exception):
        mock_log.exception.assert_called_once_with("Error message")
        assert result == "Error Value"
    else:
        mock_log.exception.assert_not_called()
        assert result == side_effect

    func.assert_called_once_with(1, 2, val=3)


@pytest.mark.parametrize("has_bucket", [True, False])
@pytest.mark.parametrize("metadata", [None, {"foo": "bar"}])
def test_sync_s3_text(mock_ocw_learning_bucket, has_bucket, metadata):
    """Verify data is saved to S3 if a bucket and metadata are provided"""
    key = "fake_key"
    sync_s3_text(mock_ocw_learning_bucket.bucket if has_bucket else None, key, metadata)
    s3_objects = [
        s3_obj
        for s3_obj in mock_ocw_learning_bucket.bucket.objects.filter(
            Prefix=f"extracts/{key}"
        )
    ]
    assert len(s3_objects) == (1 if has_bucket and metadata is not None else 0)


@pytest.mark.parametrize("token", ["abc123", "", None])
@pytest.mark.parametrize("data", [b"data", b"", None])
@pytest.mark.parametrize("headers", [None, {"a": "header"}])
def test_extract_text_metadata(mocker, data, token, settings, headers):
    """Verify that tika is called and returns a response"""
    settings.TIKA_ACCESS_TOKEN = token
    mock_response = {"metadata": {"Author:": "MIT"}, "content": "Extracted text"}
    mock_tika = mocker.patch(
        "course_catalog.etl.utils.tika_parser.from_buffer", return_value=mock_response
    )
    response = extract_text_metadata(data, other_headers=headers)

    expected_headers = {}
    if token:
        expected_headers["X-Access-Token"] = token
    if headers:
        expected_headers = {**expected_headers, **headers}

    if data:
        assert response == mock_response
        mock_tika.assert_called_once_with(
            data,
            requestOptions={"headers": expected_headers} if expected_headers else {},
        )
    else:
        assert response is None
        mock_tika.assert_not_called()


@pytest.mark.parametrize("content", ["text", None])
def test_extract_text_from_url(mocker, content):
    """extract_text_from_url should make appropriate requests and calls to extract_text_metadata"""
    mime_type = "application/pdf"
    url = "http://test.edu/file.pdf"
    mock_request = mocker.patch(
        "course_catalog.etl.utils.requests.get",
        return_value=mocker.Mock(content=content),
    )
    mock_extract = mocker.patch("course_catalog.etl.utils.extract_text_metadata")
    extract_text_from_url(url, mime_type=mime_type)

    mock_request.assert_called_once_with(url)
    if content:
        mock_extract.assert_called_once_with(
            content, other_headers={"Content-Type": mime_type}
        )


@pytest.mark.parametrize(
    "url,uuid",
    [
        [
            "https://executive.mit.edu/openenrollment/program/managing-product-platforms",
            "6626ef0d6c8e3000a9ba7a7f509156aa",
        ],
        [
            "https://executive.mit.edu/openenrollment/program/negotiation-for-executives",
            "6b7d9f0b7a193048aae11054cbd38753",
        ],
    ],
)
def test_generate_unique_id(url, uuid):
    """Test that the same uuid is always created for a given URL"""
    assert generate_unique_id(url) == uuid


def test_strip_extra_whitespace():
    """Test that extra whitespace is removed from text"""
    text = " This\n\n is      a\t\ttest. "
    assert strip_extra_whitespace(text) == "This is a test."


def test_parse_dates():
    """Test that parse_dates returns correct dates"""
    for datestring in ("May 13-30, 2020", "May 13 - 30,2020"):
        assert parse_dates(datestring) == (
            datetime.datetime(2020, 5, 13, 12, tzinfo=pytz.utc),
            datetime.datetime(2020, 5, 30, 12, tzinfo=pytz.utc),
        )
    for datestring in ("Jun 24-Aug 11, 2020", "Jun  24 -  Aug 11,    2020"):
        assert parse_dates(datestring) == (
            datetime.datetime(2020, 6, 24, 12, tzinfo=pytz.utc),
            datetime.datetime(2020, 8, 11, 12, tzinfo=pytz.utc),
        )
    for datestring in ("Nov 25, 2020-Jan 26, 2021", "Nov 25,2020  -Jan   26,2021"):
        assert parse_dates(datestring) == (
            datetime.datetime(2020, 11, 25, 12, tzinfo=pytz.utc),
            datetime.datetime(2021, 1, 26, 12, tzinfo=pytz.utc),
        )
    assert parse_dates("This is not a date") is None


def test_map_topics(mocker):
    """Test that map_topics returns expected EdX topics"""
    mock_log = mocker.patch("course_catalog.etl.utils.log.exception")
    mapping = {
        "Innovation": ["Business & Management"],
        "Management & Engineering": ["Engineering", "Business & Management"],
        "Physics": ["Science"],
    }
    assert map_topics(["Physics", "Innovation"], mapping) == [
        "Business & Management",
        "Science",
    ]
    assert map_topics(["Management & Engineering", "Innovation"], mapping) == [
        "Business & Management",
        "Engineering",
    ]
    assert map_topics(["Physics", "Biology"], mapping) == ["Science"]
    mock_log.assert_called_once_with(
        "No topic mapping found for %s in %s", "Biology", json.dumps(mapping)
    )


def test_get_text_from_element():
    """get_text_from_element should walk through elements, extracting text, and ignoring script and style tags completely."""
    input_xml = """
    <vertical display_name="name">
    pre-text
    <style attr="ibute">
    style stuff here
    </style>
    <script>
    scripty script
    </script>
    <other>
    some
    <inner>
    important
    </inner>
    text here
    </other>
    post-text
    </vertical>
    """

    ret = get_text_from_element(etree.fromstring(input_xml))
    assert ret == (
        "\n    pre-text\n     \n    some\n     \n    important"
        "\n     \n    text here\n     \n    post-text\n    "
    )


@pytest.mark.parametrize("has_metadata", [True, False])
@pytest.mark.parametrize("matching_checksum", [True, False])
def test_transform_content_files(mocker, has_metadata, matching_checksum):
    """transform_content_files"""
    run = LearningResourceRunFactory.create(published=True)
    document = "some text in the document"
    key = "a key here"
    content_type = "course"
    checksum = "7s35721d1647f962d59b8120a52210a7"
    metadata = (
        {"Author": "author", "language": "French", "title": "the title of the course"}
        if has_metadata
        else None
    )
    tika_output = {"content": "tika'ed text", "metadata": metadata}
    if matching_checksum:
        ContentFileFactory.create(
            content=tika_output["content"],
            content_author=metadata["Author"] if metadata else "",
            content_title=metadata["title"] if metadata else "",
            content_language=metadata["language"] if metadata else "",
            content_type=content_type,
            published=True,
            run=run,
            checksum=checksum,
            key=key,
        )

    documents_mock = mocker.patch(
        "course_catalog.etl.utils.documents_from_olx",
        return_value=[
            (document, {"key": key, "content_type": content_type, "checksum": checksum})
        ],
    )
    extract_mock = mocker.patch(
        "course_catalog.etl.utils.extract_text_metadata", return_value=tika_output
    )

    script_dir = os.path.dirname(
        os.path.dirname(pathlib.Path(__file__).parent.absolute())
    )

    content = [
        f
        for f in transform_content_files(
            os.path.join(script_dir, "test_json", "exported_courses_12345.tar.gz"), run
        )
    ]
    assert content == [
        {
            "content": tika_output["content"],
            "key": key,
            "published": True,
            "content_author": metadata["Author"] if has_metadata else "",
            "content_title": metadata["title"] if has_metadata else "",
            "content_language": metadata["language"] if has_metadata else "",
            "content_type": content_type,
            "checksum": checksum,
        }
    ]
    if matching_checksum:
        extract_mock.assert_not_called()
    else:
        extract_mock.assert_called_once_with(document, other_headers={})
    assert documents_mock.called is True


def test_documents_from_olx():
    """Test for documents_from_olx"""
    parsed_documents = get_olx_test_docs()
    assert len(parsed_documents) == 108

    expected_parsed_vertical = (
        "\n    Where all of the tests are defined  Jasmine tests: HTML module edition \n"
        " Did it break? Dunno; let's find out. \n Some of the libraries tested are only served "
        "by the LMS for courseware, therefore, some tests can be expected to fail if executed in Studio."
        " \n\n  Where Jasmine will inject its output (dictated in boot.js)"
        "  \n Test output will generate here when viewing in LMS."
    )
    assert parsed_documents[0] == (
        expected_parsed_vertical,
        {
            "key": "vertical_1",
            "title": "HTML",
            "content_type": CONTENT_TYPE_VERTICAL,
            "mime_type": "application/xml",
            "checksum": "2c35721d1647f962d59b8120a52210a7",
        },
    )
    formula2do = [
        doc for doc in parsed_documents if doc[1]["key"].endswith("formula2do.xml")
    ][0]
    assert formula2do[0] == b'<html filename="formula2do" display_name="To do list"/>\n'
    assert formula2do[1]["key"].endswith("formula2do.xml")
    assert formula2do[1]["content_type"] == CONTENT_TYPE_FILE
    assert formula2do[1]["mime_type"].endswith("/xml")


def test_documents_from_olx_bad_vertical(mocker):
    """An exception should be logged if verticals can't be read, other files should still be processed"""
    mock_log = mocker.patch("course_catalog.etl.utils.log.exception")
    mock_bundle = mocker.patch("course_catalog.etl.utils.XBundle")
    mock_bundle.return_value.import_from_directory.side_effect = OSError()
    parsed_documents = get_olx_test_docs()
    mock_log.assert_called_once_with("Could not read verticals from path %s", ANY)
    assert len(parsed_documents) == 92


def test_extract_valid_department_from_id():
    """Test that correct department is extracted from ID"""
    assert extract_valid_department_from_id("MITx+7.03.2x") == ["7"]
    assert extract_valid_department_from_id("course-v1:MITxT+21A.819.2x") == ["21A"]
    # Has a department not in the list and thus should not be entered
    assert extract_valid_department_from_id("course-v1:MITxT+123.658.2x") is None
    # Has no discernible department
    assert extract_valid_department_from_id("MITx+CITE101x") is None
    assert extract_valid_department_from_id("RanD0mStr1ng") is None


@pytest.mark.parametrize("platform", [PlatformType.mitx.value, PlatformType.xpro.value])
def test_get_learning_course_bucket(
    aws_settings, mock_mitx_learning_bucket, mock_xpro_learning_bucket, platform
):  # pylint: disable=unused-argument
    """The correct bucket should be returned by the function"""
    assert get_learning_course_bucket(platform).name == (
        aws_settings.EDX_LEARNING_COURSE_BUCKET_NAME
        if platform == PlatformType.mitx.value
        else aws_settings.XPRO_LEARNING_COURSE_BUCKET_NAME
    )
