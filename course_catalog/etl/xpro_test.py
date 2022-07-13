"""Tests for MicroMasters ETL functions"""
# pylint: disable=redefined-outer-name
from datetime import datetime
from itertools import chain
import json
import os
import pathlib
from subprocess import check_call
from tempfile import TemporaryDirectory

from lxml import etree
import pytest

from course_catalog.constants import (
    PlatformType,
    CONTENT_TYPE_VERTICAL,
    CONTENT_TYPE_FILE,
)
from course_catalog.etl import xpro
from course_catalog.etl.xpro import (
    _parse_datetime,
    transform_content_files,
    documents_from_olx,
    get_text_from_element,
    UCC_TOPIC_MAPPINGS,
)
from open_discussions.test_utils import any_instance_of


@pytest.fixture
def mock_xpro_programs_data():
    """Mock xpro data"""
    with open("./test_json/xpro_programs.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mock_xpro_courses_data():
    """Mock xpro data"""
    with open("./test_json/xpro_courses.json", "r") as f:
        return json.loads(f.read())


@pytest.fixture
def mocked_xpro_programs_responses(mocked_responses, settings, mock_xpro_programs_data):
    """Mock the programs api response"""
    settings.XPRO_CATALOG_API_URL = "http://localhost/test/programs/api"
    mocked_responses.add(
        mocked_responses.GET,
        settings.XPRO_CATALOG_API_URL,
        json=mock_xpro_programs_data,
    )
    yield mocked_responses


@pytest.fixture
def mocked_xpro_courses_responses(mocked_responses, settings, mock_xpro_courses_data):
    """Mock the courses api response"""
    settings.XPRO_COURSES_API_URL = "http://localhost/test/courses/api"
    mocked_responses.add(
        mocked_responses.GET, settings.XPRO_COURSES_API_URL, json=mock_xpro_courses_data
    )
    yield mocked_responses


@pytest.mark.usefixtures("mocked_xpro_programs_responses")
def test_xpro_extract_programs(mock_xpro_programs_data):
    """Verify that the extraction function calls the xpro programs API and returns the responses"""
    assert xpro.extract_programs() == mock_xpro_programs_data


def test_xpro_extract_programs_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.XPRO_CATALOG_API_URL = None
    assert xpro.extract_programs() == []


@pytest.mark.usefixtures("mocked_xpro_courses_responses")
def test_xpro_extract_courses(mock_xpro_courses_data):
    """Verify that the extraction function calls the xpro courses API and returns the responses"""
    assert xpro.extract_courses() == mock_xpro_courses_data


def test_xpro_extract_courses_disabled(settings):
    """Verify an empty list is returned if the API URL isn't set"""
    settings.XPRO_COURSES_API_URL = None
    assert xpro.extract_courses() == []


def test_xpro_transform_programs(mock_xpro_programs_data):
    """Test that xpro program data is correctly transformed into our normalized structure"""
    result = xpro.transform_programs(mock_xpro_programs_data)
    expected = [
        {
            "program_id": program_data["readable_id"],
            "title": program_data["title"],
            "image_src": program_data["thumbnail_url"],
            "short_description": program_data["description"],
            "offered_by": xpro.OFFERED_BY,
            "published": bool(program_data["current_price"]),
            "url": program_data["url"],
            "topics": [
                {"name": topic_name}
                for topic_name in chain.from_iterable(
                    [
                        UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]])
                        for topic in program_data.get("topics", [])
                    ]
                )
            ],
            "runs": [
                {
                    "run_id": program_data["readable_id"],
                    "platform": PlatformType.xpro.value,
                    "start_date": any_instance_of(datetime, type(None)),
                    "end_date": any_instance_of(datetime, type(None)),
                    "enrollment_start": any_instance_of(datetime, type(None)),
                    "best_start_date": _parse_datetime(
                        program_data["enrollment_start"] or program_data["start_date"]
                    ),
                    "best_end_date": _parse_datetime(program_data["end_date"]),
                    "prices": [{"price": program_data["current_price"], "mode": ""}]
                    if program_data["current_price"]
                    else [],
                    "instructors": [
                        {"full_name": instructor["name"]}
                        for instructor in program_data.get("instructors", [])
                    ],
                    "title": program_data["title"],
                    "short_description": program_data["description"],
                    "offered_by": xpro.OFFERED_BY,
                }
            ],
            "courses": [
                {
                    "course_id": course_data["readable_id"],
                    "platform": PlatformType.xpro.value,
                    "title": course_data["title"],
                    "image_src": course_data["thumbnail_url"],
                    "short_description": course_data["description"],
                    "offered_by": xpro.OFFERED_BY,
                    "published": any(
                        map(
                            lambda course_run: course_run.get("current_price", None),
                            course_data["courseruns"],
                        )
                    ),
                    "topics": [
                        {"name": topic_name}
                        for topic_name in chain.from_iterable(
                            [
                                UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]])
                                for topic in course_data.get("topics", [])
                            ]
                        )
                    ],
                    "runs": [
                        {
                            "run_id": course_run_data["courseware_id"],
                            "platform": PlatformType.xpro.value,
                            "start_date": any_instance_of(datetime, type(None)),
                            "end_date": any_instance_of(datetime, type(None)),
                            "enrollment_start": any_instance_of(datetime, type(None)),
                            "enrollment_end": any_instance_of(datetime, type(None)),
                            "best_start_date": _parse_datetime(
                                course_run_data["enrollment_start"]
                                or course_run_data["start_date"]
                            ),
                            "best_end_date": _parse_datetime(
                                course_run_data["enrollment_end"]
                                or course_run_data["end_date"]
                            ),
                            "offered_by": xpro.OFFERED_BY,
                            "published": bool(course_run_data["current_price"]),
                            "prices": [{"price": course_run_data["current_price"]}]
                            if course_run_data["current_price"]
                            else [],
                            "instructors": [
                                {"full_name": instructor["name"]}
                                for instructor in course_run_data["instructors"]
                            ],
                        }
                        for course_run_data in course_data["courseruns"]
                    ],
                }
                for course_data in program_data["courses"]
            ],
        }
        for program_data in mock_xpro_programs_data
    ]
    assert expected == result


def test_xpro_transform_courses(mock_xpro_courses_data):
    """Test that xpro courses data is correctly transformed into our normalized structure"""
    result = xpro.transform_courses(mock_xpro_courses_data)
    expected = [
        {
            "course_id": course_data["readable_id"],
            "platform": PlatformType.xpro.value,
            "title": course_data["title"],
            "image_src": course_data["thumbnail_url"],
            "short_description": course_data["description"],
            "offered_by": xpro.OFFERED_BY,
            "published": any(
                map(
                    lambda course_run: course_run.get("current_price", None),
                    course_data["courseruns"],
                )
            ),
            "topics": [
                {"name": topic_name}
                for topic_name in chain.from_iterable(
                    [
                        UCC_TOPIC_MAPPINGS.get(topic["name"], [topic["name"]])
                        for topic in course_data.get("topics", [])
                    ]
                )
            ],
            "runs": [
                {
                    "run_id": course_run_data["courseware_id"],
                    "platform": PlatformType.xpro.value,
                    "start_date": any_instance_of(datetime, type(None)),
                    "end_date": any_instance_of(datetime, type(None)),
                    "enrollment_start": any_instance_of(datetime, type(None)),
                    "enrollment_end": any_instance_of(datetime, type(None)),
                    "best_start_date": _parse_datetime(
                        course_run_data["enrollment_start"]
                        or course_run_data["start_date"]
                    ),
                    "best_end_date": _parse_datetime(
                        course_run_data["enrollment_end"] or course_run_data["end_date"]
                    ),
                    "offered_by": xpro.OFFERED_BY,
                    "published": bool(course_run_data["current_price"]),
                    "prices": [{"price": course_run_data["current_price"]}]
                    if course_run_data["current_price"]
                    else [],
                    "instructors": [
                        {"full_name": instructor["name"]}
                        for instructor in course_run_data["instructors"]
                    ],
                }
                for course_run_data in course_data["courseruns"]
            ],
        }
        for course_data in mock_xpro_courses_data
    ]
    assert expected == result


@pytest.mark.parametrize("has_metadata", [True, False])
def test_transform_content_files(mocker, has_metadata):
    """transform_content_files"""
    document = "some text in the document"
    key = "a key here"
    content_type = "course"
    metadata = (
        {"Author": "author", "language": "French", "title": "the title of the course"}
        if has_metadata
        else None
    )
    tika_output = {"content": "tika'ed text", "metadata": metadata}
    documents_mock = mocker.patch(
        "course_catalog.etl.xpro.documents_from_olx",
        return_value=[(document, {"key": key, "content_type": content_type})],
    )
    extract_mock = mocker.patch(
        "course_catalog.etl.xpro.extract_text_metadata", return_value=tika_output
    )

    script_dir = os.path.dirname(
        os.path.dirname(pathlib.Path(__file__).parent.absolute())
    )
    content = transform_content_files(
        os.path.join(script_dir, "test_json", "exported_courses_12345.tar.gz")
    )
    assert content == [
        {
            "content": tika_output["content"],
            "key": key,
            "content_author": metadata["Author"] if has_metadata else "",
            "content_title": metadata["title"] if has_metadata else "",
            "content_language": metadata["language"] if has_metadata else "",
            "content_type": content_type,
        }
    ]
    extract_mock.assert_called_once_with(document, other_headers={})
    assert documents_mock.called is True


def test_documents_from_olx():
    """test for documents_from_olx"""
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
        parsed_documents = documents_from_olx(olx_path)
    assert len(parsed_documents) == 106

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
        },
    )
    formula2do = [
        doc for doc in parsed_documents if doc[1]["key"].endswith("formula2do.xml")
    ][0]
    assert formula2do[0] == b'<html filename="formula2do" display_name="To do list"/>\n'
    assert formula2do[1]["key"].endswith("formula2do.xml")
    assert formula2do[1]["content_type"] == CONTENT_TYPE_FILE
    assert formula2do[1]["mime_type"] == "application/xml"


def test_get_text_from_element():
    """
    get_text_from_element should walk through elements, extracting text, and ignoring script and style tags completely.
    """
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
