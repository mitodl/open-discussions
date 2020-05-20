"""Tests for MIT Professional Education ETL"""

import datetime
from decimal import Decimal

import pytest
import pytz
from bs4 import BeautifulSoup

from course_catalog.etl.mitpe import (
    transform,
    extract,
    _parse_price,
    _parse_topics,
    PLATFORM,
)
from course_catalog.factories import LearningResourceRunFactory

short_description = "Eleifend donec pretium vulputate sapien. Magna eget est lorem ipsum. Sed adipiscing diam donec \
adipiscing tristique risus. Eget arcu dictum varius duis at consectetur lorem donec massa. Semper quis lectus nulla \
at volutpat diam. Bibendum enim facilisis gravida neque."

full_description = "Eleifend donec pretium vulputate sapien. Magna eget est lorem ipsum. Sed adipiscing diam donec \
adipiscing tristique risus. Eget arcu dictum varius duis at consectetur lorem donec massa. Semper quis lectus nulla \
at volutpat diam. Bibendum enim facilisis gravida neque. Mauris rhoncus aenean vel elit scelerisque. Sit amet cursus \
sit amet dictum sit amet. Tellus pellentesque eu tincidunt tortor aliquam nulla facilisi cras fermentum: Nulla at \
volutpat diam ut venenatis tellus. Habitant morbi tristique senectus et netus et. Metus vulputate eu scelerisque \
felis imperdiet proin. (test@test.edu) or Marcus Aurelius (maurelius@test.edu)."

title = "Vitae Tempus Quam Pellentesque Nec Nam Aliquam Sem"


@pytest.fixture(autouse=True)
def mock_request(mocker):
    """
    Mock request data
    """
    with open("./test_html/test_mitpe_listings.html") as f:
        mitpe_course_listings = f.read()
    with open("./test_html/test_mitpe_details.html") as f:
        mitpe_course_details = f.read()
    mocker.patch(
        "course_catalog.etl.mitpe.requests.get",
        autospec=True,
        side_effect=[
            mocker.Mock(content=mitpe_course_listings),
            mocker.Mock(content=mitpe_course_details),
        ],
    )


@pytest.mark.parametrize("base_url", [None, "", "https://professional.mit.edu"])
def test_mitpe_extract(settings, base_url):
    """Verify that BeautifulSoup tags are returned per listing and course detail"""
    settings.MITPE_BASE_URL = base_url
    results = extract()
    assert len(results) == (1 if base_url else 0)

    assert results == (
        [
            {
                "url": "https://professional.mit.edu/course-catalog/mitpe-course-detail",
                "title": title,
                "dates": [
                    (
                        datetime.datetime(2020, 7, 13, 12, 0, tzinfo=pytz.utc),
                        datetime.datetime(2020, 7, 17, 12, 0, tzinfo=pytz.utc),
                    )
                ],
                "price": Decimal("5500"),
                "topics": ["Innovation", "Systems Engineering"],
                "short_description": short_description,
                "full_description": full_description,
                "instructors": [["Marcus", "Aurelius I"]],
            }
        ]
        if base_url
        else []
    )


@pytest.mark.django_db
def test_mitpe_transform(settings):
    """Verify that the correct dict data is returned for a course"""
    settings.MITPE_BASE_URL = "https://professional.mit.edu"
    assert transform(extract()) == [
        {
            "url": "https://professional.mit.edu/course-catalog/mitpe-course-detail",
            "title": title,
            "topics": [{"name": "Innovation"}, {"name": "Systems Engineering"}],
            "short_description": short_description,
            "full_description": full_description,
            "course_id": "1521458eeb30384493bf77850e3fa004",
            "platform": "mitpe",
            "offered_by": [{"name": "Professional Education"}],
            "published": True,
            "runs": [
                {
                    "prices": [{"price": Decimal("5500")}],
                    "run_id": "244ecdafc79537ffa058dc151abd0783",
                    "platform": "mitpe",
                    "start_date": datetime.datetime(
                        2020, 7, 13, 12, 0, tzinfo=pytz.utc
                    ),
                    "end_date": datetime.datetime(2020, 7, 17, 12, 0, tzinfo=pytz.utc),
                    "best_start_date": datetime.datetime(
                        2020, 7, 13, 12, 0, tzinfo=pytz.utc
                    ),
                    "best_end_date": datetime.datetime(
                        2020, 7, 17, 12, 0, tzinfo=pytz.utc
                    ),
                    "offered_by": [{"name": "Professional Education"}],
                    "title": title,
                    "url": "https://professional.mit.edu/course-catalog/mitpe-course-detail",
                    "short_description": short_description,
                    "full_description": full_description,
                    "instructors": [
                        {"first_name": "Marcus", "last_name": "Aurelius I"}
                    ],
                }
            ],
        }
    ]


@pytest.mark.django_db
@pytest.mark.parametrize("run_exists", [True, False])
def test_mitpe_transform_nodates(settings, mocker, run_exists):
    """A course should not be imported if it has no run dates"""
    settings.MITPE_BASE_URL = "https://professional.mit.edu"
    mocker.patch("course_catalog.etl.mitpe.parse_dates", return_value=[])

    if run_exists:
        LearningResourceRunFactory.create(
            platform=PLATFORM,
            run_id="244ecdafc79537ffa058dc151abd0783",
            content_object__platform=PLATFORM,
            content_object__course_id="1521458eeb30384493bf77850e3fa004",
        )

    assert transform(extract()) == [
        {
            "url": "https://professional.mit.edu/course-catalog/mitpe-course-detail",
            "title": title,
            "topics": [{"name": "Innovation"}, {"name": "Systems Engineering"}],
            "short_description": short_description,
            "full_description": full_description,
            "course_id": "1521458eeb30384493bf77850e3fa004",
            "platform": "mitpe",
            "offered_by": [{"name": "Professional Education"}],
            "published": run_exists,
            "runs": [],
        }
    ]


@pytest.mark.parametrize(
    "html, price",
    [
        ["<div class='views-field-field-course-fee'>$4,100</div>", Decimal("4100")],
        [
            "<div class='views-field-field-course-fee'>$$75100  (excluding accommodations)</div>",
            Decimal("75100"),
        ],
        ["<div class='foo'>$4,100</div>", None],
        ["<div class='views-field-field-course-fee'>TBD</div>", None],
    ],
)
def test__parse_price(html, price):
    """Test that __parse_price returns the expected value"""
    soup = BeautifulSoup(html, "html.parser")
    assert _parse_price(soup) == price


def test_blank_topics():
    """Test that an empty list is returned if no topic section is found"""
    html = "<div>test</div>"
    soup = BeautifulSoup(html, "html.parser")
    assert _parse_topics(soup) == []
