"""Tests for MicroMasters ETL functions"""
# pylint: disable=redefined-outer-name
from datetime import datetime
import json
import os
import pathlib
from subprocess import check_call
from tempfile import TemporaryDirectory

import pytest

from course_catalog.constants import PlatformType
from course_catalog.etl import xpro
from course_catalog.etl.xpro import (
    _parse_datetime,
    transform_content_files,
    documents_from_olx,
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
            "topics": program_data.get("topics", []),
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
                    "topics": course_data.get("topics", []),
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
            "topics": course_data.get("topics", []),
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


def test_transform_content_files(mocker):
    """transform_content_files """
    document = "some text in the document"
    key = "a key here"
    tika_output = {"content": "tika'ed text"}
    documents_mock = mocker.patch(
        "course_catalog.etl.xpro.documents_from_olx", return_value=[(document, key)]
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
    assert content == [{"content": tika_output["content"], "key": key}]
    extract_mock.assert_called_once_with(document)
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
    assert len(parsed_documents) == 16

    expected_parsed_vertical = b"""<vertical display_name="HTML">
  <html display_name="Jasmine tests: HTML module edition" editor="raw"><head><link rel="stylesheet" type="text/css" href="/static/jasmine.css"/><script type="text/javascript" src="/static/jasmine.js"/><script type="text/javascript" src="/static/jasmine-html.js"/><script type="text/javascript" src="/static/boot.js"/><!-- Where all of the tests are defined --><script type="text/javascript" src="/static/jasmine-tests.js"/><script>
  (function () {
    window.runJasmineTests()
  }());
</script></head><body><h2>Jasmine tests: HTML module edition</h2>
<h3>Did it break? Dunno; let's find out.</h3>
<p>Some of the libraries tested are only served by the LMS for courseware, therefore, some tests can be expected to fail if executed in Studio.</p>

<!-- Where Jasmine will inject its output (dictated in boot.js) -->
<div id="jasmine-tests"><em>Test output will generate here when viewing in LMS.</em></div></body></html></vertical>"""
    assert parsed_documents[0] == (expected_parsed_vertical, "vertical_1")
