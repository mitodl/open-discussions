"""OpenEdx ETL tests"""
# pylint: disable=redefined-outer-name
from datetime import datetime
from urllib.parse import urlencode

import pytest

from course_catalog.etl.constants import COMMON_HEADERS
from course_catalog.etl.openedx import (
    OpenEdxConfiguration,
    openedx_extract_transform_factory,
)
from open_discussions.test_utils import any_instance_of

ACCESS_TOKEN = "invalid_access_token"


@pytest.fixture
def openedx_config():
    """Fixture for the openedx config object"""
    return OpenEdxConfiguration(
        "fake-client-id",
        "fake-client-secret",
        "http://localhost/fake-access-token-url/",
        "http://localhost/fake-api-url/",
        "http://localhost/fake-base-url/",
        "http://localhost/fake-alt-url/",
        "fake-platform-type",
        "fake-offered-by",
    )


@pytest.fixture
def openedx_extract_transform(openedx_config):
    """Fixture for generationg an extract/transform pair for the given config"""
    return openedx_extract_transform_factory(lambda: openedx_config)


def test_extract(mocked_responses, openedx_config, openedx_extract_transform):
    """Test the generated extract functoin walks the paginated results"""
    results1 = [1, 2, 3]
    results2 = [4, 5, 6]
    next_url = "http://localhost/next/url"

    mocked_responses.add(
        mocked_responses.POST,
        openedx_config.access_token_url,
        json={"access_token": ACCESS_TOKEN},
    )
    mocked_responses.add(
        mocked_responses.GET,
        openedx_config.api_url,
        json={"results": results1, "next": next_url},
    )
    mocked_responses.add(
        mocked_responses.GET, next_url, json={"results": results2, "next": None}
    )

    assert openedx_extract_transform.extract() == results1 + results2

    for call in mocked_responses.calls:
        # assert that headers contain our common ones
        assert set(COMMON_HEADERS.items()).issubset(set(call.request.headers.items()))

    assert mocked_responses.calls[0].request.body == urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": openedx_config.client_id,
            "client_secret": openedx_config.client_secret,
            "token_type": "jwt",
        }
    )

    for call in mocked_responses.calls[1:]:
        assert ({("Authorization", f"JWT {ACCESS_TOKEN}")}).issubset(
            set(call.request.headers.items())
        )


@pytest.mark.usefixtures("mocked_responses")
@pytest.mark.parametrize("config_arg_idx", range(6))
def test_extract_disabled(openedx_config, config_arg_idx):
    """Verify that extract() exits with no API call if configuration is missing"""
    args = list(openedx_config)
    args[config_arg_idx] = None

    config = OpenEdxConfiguration(*args)

    extract, _ = openedx_extract_transform_factory(lambda: config)

    assert extract() == []


@pytest.mark.parametrize("has_runs", [True])
@pytest.mark.parametrize("is_course_deleted", [False])
@pytest.mark.parametrize("is_course_run_deleted", [False])
def test_transform_course(
    openedx_config,
    openedx_extract_transform,
    mitx_course_data,
    has_runs,
    is_course_deleted,
    is_course_run_deleted,
):  # pylint: disable=too-many-arguments
    """Test that the transform function normalizes and filters out data"""
    extracted = mitx_course_data["results"]
    for course in extracted:
        if not has_runs:
            course["course_runs"] = []
        if is_course_deleted:
            course["title"] = f"[delete] {course['title']}"
        if is_course_run_deleted:
            for run in course["course_runs"]:
                run["title"] = f"[delete] {run['title']}"
    transformed_courses = openedx_extract_transform.transform(extracted)
    assert transformed_courses[0] == {
        "title": "The Analytics Edge",
        "course_id": "MITx+15.071x",
        "department": ["15"],
        "short_description": "short_description",
        "full_description": "full description",
        "platform": openedx_config.platform,
        "offered_by": [{"name": openedx_config.offered_by}],
        "image_src": "https://prod-discovery.edx-cdn.org/media/course/image/ff1df27b-3c97-42ee-a9b3-e031ffd41a4f-747c9c2f216e.small.jpg",
        "image_description": "Image description",
        "last_modified": any_instance_of(datetime),
        "topics": [{"name": "Data Analysis & Statistics"}],
        "url": f"{openedx_config.alt_url}MITx+15.071x/course/",
        "published": True,
        "runs": []
        if is_course_run_deleted
        else [
            {
                "availability": "Starting Soon",
                "best_end_date": "2019-05-22T23:30:00Z",
                "best_start_date": "2019-02-20T15:00:00Z",
                "run_id": "course-v1:MITx+15.071x+1T2019",
                "end_date": "2019-05-22T23:30:00Z",
                "platform": openedx_config.platform,
                "enrollment_end": None,
                "enrollment_start": None,
                "full_description": "<p>Full Description</p>",
                "image_description": None,
                "image_src": "https://prod-discovery.edx-cdn.org/media/course/image/ff1df27b-3c97-42ee-a9b3-e031ffd41a4f-747c9c2f216e.small.jpg",
                "instructors": [
                    {"first_name": "Dimitris", "last_name": "Bertsimas"},
                    {"first_name": "Allison", "last_name": "O'Hair"},
                ],
                "language": "en-us",
                "last_modified": any_instance_of(datetime),
                "level": "Intermediate",
                "offered_by": [{"name": openedx_config.offered_by}],
                "prices": [
                    {
                        "mode": "verified",
                        "price": "150.00",
                        "upgrade_deadline": "2019-03-20T15:00:00Z",
                    },
                    {"mode": "audit", "price": "0.00", "upgrade_deadline": None},
                ],
                "semester": "spring",
                "short_description": "short_description",
                "start_date": "2019-02-20T15:00:00Z",
                "title": "The Analytics Edge",
                "url": f"{openedx_config.alt_url}course-v1:MITx+15.071x+1T2019/course/",
                "year": 2019,
                "published": True,
            }
        ],
        "raw_json": extracted[0],
    }
    assert transformed_courses[1]["published"] is False
    assert transformed_courses[1]["runs"][0]["published"] is False
