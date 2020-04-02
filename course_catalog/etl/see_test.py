"""Tests for Sloan ETL"""

import datetime
from decimal import Decimal

import pytest
import pytz
from bs4 import Tag, BeautifulSoup

from course_catalog.etl.see import transform, extract, _parse_run_dates

short_description = "This program is designed to help senior executives of service businesses—especially those \
responsible for HR, operations, and customer experience—create and implement an integrated set of strategies that \
delights customers and keeps them loyal; engages a workforce and helps them find meaning and dignity in their work; \
and drives high performance and revenue."

full_description = "What makes a service business successful? The rule of thumb for many companies in industries \
like retail, hospitality, finance/banking, and health care has been to drive down wages and operating costs, creating \
a vicious cycle of disinvestment in search of higher profits. Zeynep Ton, the faculty leader for this course, asked \
herself, what if the focus shifted … Could organizations hit new standards of excellence and performance? Grounded in \
Professor Ton’s research over many years and with multiple people-intensive companies, this program is designed to \
help leaders of service businesses create an organization that delivers superior value to customers, shareholders, \
and employees at the same time. Through a combination of assessments, recent interactive case studies, lectures, and \
videos, participants will learn about the key elements of operational excellence in services and how to adapt an \
integrated set of these strategies in their organization. Participants (and a sample of their frontline employees \
and managers) can complete an assessment survey in advance of the program. The course content, combined with the data \
from the surveys, will help participants—especially those who attend as a team—identify key areas for improvement and \
provide guidance on next steps for their organizations. The course leverages a systems perspective to frame \
discussions around key elements of operational excellence in services, including: (This course was previously \
entitled The Good Jobs Strategy: Delivering Superior Value to Customers, Shareholders, and Employees .)"

title = "Achieving Operational Excellence Through People: Delivering Superior Value to Customers, Employees, \
and Shareholders"


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


def test_see_extract():
    """Verify that BeautifulSoup tags are returned per listing and course detail"""
    results = extract()
    assert len(results) == 1

    for course in results:
        assert isinstance(course["listing"], Tag)
        assert isinstance(course["details"], Tag)


def test_see_transform():
    """Verify that the correct dict data is returned for a course"""
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
                    "instructors": [{"first_name": "Zeynep", "last_name": "Ton"}],
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
