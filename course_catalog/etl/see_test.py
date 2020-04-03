"""Tests for Sloan ETL"""

import datetime
from decimal import Decimal

import pytest
import pytz
from bs4 import BeautifulSoup

from course_catalog.etl.see import transform, extract, _parse_run_dates

short_description = "Sed elementum tempus egestas sed sed risus pretium quam vulputate. Amet consectetur adipiscing \
elit ut aliquam purus sit amet luctus. Amet mauris commodo quis imperdiet massa tincidunt nunc pulvinar. Enim sit \
amet venenatis urna cursus eget. Eleifend donec pretium vulputate sapien nec sagittis aliquam malesuada. Amet nulla \
facilisi morbi tempus iaculis urna id."

full_description = "Accumsan in nisl nisi scelerisque eu. Velit scelerisque in dictum non consectetur a erat nam. \
Ut faucibus pulvinar elementum integer enim. Augue ut lectus arcu bibendum at varius vel pharetra vel. Amet \
consectetur adipiscing elit pellentesque habitant morbi tristique senectus. In vitae turpis massa sed elementum \
tempus. Magna eget est lorem ipsum dolor. Nisi scelerisque eu ultrices vitae auctor. Pulvinar mattis nunc sed blandit \
libero volutpat sed. Id nibh tortor id aliquet lectus proin nibh nisl. Semper quis lectus nulla at. Vehicula ipsum a \
arcu cursus vitae congue mauris rhoncus … Dignissim sodales ut eu sem integer vitae justo eget? Id diam maecenas \
ultricies mi eget mauris pharetra et. Aliquet risus feugiat in ante metus dictum at tempor. Ipsum a arcu cursus \
vitae congue mauris rhoncus. At tempor commodo ullamcorper a lacus. Ut faucibus pulvinar elementum integer enim \
neque volutpat. Convallis posuere morbi leo urna molestie. Sed arcu non odio euismod: Cursus in hac habitasse platea \
dictumst quisque. Sed enim ut sem viverra aliquet eget."

title = "Nunc Eget Lorem Dolor Sed Viverra Ipsum Nunc"


@pytest.fixture(autouse=True)
def mock_request(mocker):
    """
    Mock request data
    """
    with open("./test_html/test_see_listings.html") as f:
        see_course_listings = f.read()
    with open("./test_html/test_see_details.html") as f:
        see_course_details = f.read()
    mocker.patch(
        "course_catalog.etl.see.requests.get",
        autospec=True,
        side_effect=[
            mocker.Mock(content=see_course_listings),
            mocker.Mock(content=see_course_details),
        ],
    )


@pytest.mark.parametrize("base_url", [None, "", "https://executive.mit.edu"])
def test_see_extract(settings, base_url):
    """Verify that BeautifulSoup tags are returned per listing and course detail"""
    settings.SEE_BASE_URL = base_url
    results = extract()
    assert len(results) == (1 if base_url else 0)

    assert results == (
        [
            {
                "url": "https://executive.mit.edu/openenrollment/program/foobar/",
                "title": title,
                "dates": [
                    (
                        datetime.datetime(2020, 6, 18, 0, 0, tzinfo=pytz.utc),
                        datetime.datetime(2020, 6, 19, 0, 0, tzinfo=pytz.utc),
                    )
                ],
                "price": Decimal("4100"),
                "topics": [
                    "Operations",
                    "Organizations & Leadership",
                    "Strategy & Innovation",
                ],
                "short_description": short_description,
                "full_description": full_description,
                "instructors": [["Robert", "Van de Graaff"]],
            }
        ]
        if base_url
        else []
    )


def test_see_transform(settings):
    """Verify that the correct dict data is returned for a course"""
    settings.SEE_BASE_URL = "https://executive.mit.edu"
    assert transform(extract()) == [
        {
            "url": "https://executive.mit.edu/openenrollment/program/foobar/",
            "title": title,
            "topics": [
                {"name": "Operations"},
                {"name": "Organizations & Leadership"},
                {"name": "Strategy & Innovation"},
            ],
            "short_description": short_description,
            "full_description": full_description,
            "course_id": "b5bdcbf344fe3a43b426844a49b99dc1",
            "platform": "see",
            "offered_by": [{"name": "Sloan Executive Education"}],
            "runs": [
                {
                    "prices": [{"price": Decimal("4100")}],
                    "run_id": "155263c3961b37d293795db27b89fe5b",
                    "platform": "see",
                    "start_date": datetime.datetime(2020, 6, 18, 0, 0, tzinfo=pytz.utc),
                    "end_date": datetime.datetime(2020, 6, 19, 0, 0, tzinfo=pytz.utc),
                    "best_start_date": datetime.datetime(
                        2020, 6, 18, 0, 0, tzinfo=pytz.utc
                    ),
                    "best_end_date": datetime.datetime(
                        2020, 6, 19, 0, 0, tzinfo=pytz.utc
                    ),
                    "offered_by": [{"name": "Sloan Executive Education"}],
                    "title": title,
                    "url": "https://executive.mit.edu/openenrollment/program/foobar/",
                    "short_description": short_description,
                    "full_description": full_description,
                    "instructors": [
                        {"first_name": "Robert", "last_name": "Van de Graaff"}
                    ],
                }
            ],
        }
    ]


def test__parse_run_dates():
    """Test that _parse_run_dates returns correct dates"""
    html = "<ul><li>0</li><li>1</li><li>2</li>\
    <li>May 13-30, 2020 | Jun 24-Aug 11, 2020 | Nov 25, 2020-Jan 26, 2021</li></ul>"
    soup = BeautifulSoup(html, "html.parser")
    assert _parse_run_dates(soup) == [
        (
            datetime.datetime(2020, 5, 13, tzinfo=pytz.utc),
            datetime.datetime(2020, 5, 30, tzinfo=pytz.utc),
        ),
        (
            datetime.datetime(2020, 6, 24, tzinfo=pytz.utc),
            datetime.datetime(2020, 8, 11, tzinfo=pytz.utc),
        ),
        (
            datetime.datetime(2020, 11, 25, tzinfo=pytz.utc),
            datetime.datetime(2021, 1, 26, tzinfo=pytz.utc),
        ),
    ]
