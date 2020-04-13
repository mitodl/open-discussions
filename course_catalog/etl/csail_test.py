"""Tests for MIT Professional Education ETL"""

import datetime
from decimal import Decimal

import pytest
import pytz
from bs4 import BeautifulSoup
from requests.exceptions import SSLError

from course_catalog.etl.csail import (
    transform,
    extract,
    _parse_price,
    _parse_run_dates,
    _unverified_cert_request,
    _parse_instructors,
    _parse_image,
)

# pylint: disable=unused-argument,redefined-outer-name

short_description = "Ut faucibus pulvinar elementum integer enim neque volutpat ac. Pretium fusce id velit ut tortor \
pretium viverra suspendisse. Massa enim nec dui nunc mattis. Leo in vitae turpis massa sed elementum. Erat imperdiet \
sed euismod nisi porta lorem. Nascetur ridiculus mus mauris vitae ultricies leo integer malesuada nunc. At varius vel \
pharetra vel turpis nunc eget."

full_description = "Risus nullam eget felis eget. Dignissim enim sit amet venenatis urna cursus eget nunc \
scelerisque. Sed libero enim sed faucibus turpis in eu. Fusce ut placerat orci nulla pellentesque dignissim enim sit. \
Habitant morbi tristique senectus et netus et malesuada fames. Enim sed faucibus turpis in eu mi bibendum neque \
egestas. Eget gravida cum sociis natoque penatibus et magnis dis."

title = "Semper Quis Lectus Nulla At"


@pytest.fixture
def mock_request(mocker):
    """
    Mock request data
    """
    with open("./test_html/test_csail_listings.html") as f:
        csail_course_listings = f.read()
    with open("./test_html/test_csail_details.html") as f:
        csail_course_details = f.read()
    mocker.patch(
        "course_catalog.etl.csail.requests.get",
        autospec=True,
        side_effect=[
            mocker.Mock(content=csail_course_listings),
            mocker.Mock(content=csail_course_details),
        ],
    )


@pytest.mark.parametrize("base_url", [None, "", "https://cap.csail.mit.edu/"])
def test_csail_extract(settings, base_url, mock_request):
    """Verify that BeautifulSoup tags are returned per listing and course detail"""
    settings.CSAIL_BASE_URL = base_url
    results = extract()
    assert len(results) == (1 if base_url else 0)

    assert results == (
        [
            {
                "url": "https://cap.csail.mit.edu/course-catalog/csail-course-detail",
                "title": title,
                "dates": [
                    (
                        datetime.datetime(2020, 5, 6, 12, 0, tzinfo=pytz.utc),
                        datetime.datetime(2020, 6, 17, 12, 0, tzinfo=pytz.utc),
                    )
                ],
                "price": Decimal("2500"),
                "image_src": "https://cap.csail.mit.edu/sites/Image%202%20-1024x890.jpeg",
                "short_description": short_description,
                "full_description": full_description,
                "instructors": [
                    ["Marcus", "Aurelius"],
                    ["Tiberius", "Gracchus"],
                    ["Gaius", "Marius II"],
                ],
            }
        ]
        if base_url
        else []
    )


def test_csail_transform(settings, mock_request):
    """Verify that the correct dict data is returned for a course"""
    settings.CSAIL_BASE_URL = "https://cap.csail.mit.edu/"
    assert transform(extract()) == [
        {
            "url": "https://cap.csail.mit.edu/course-catalog/csail-course-detail",
            "title": title,
            "short_description": short_description,
            "full_description": full_description,
            "course_id": "9d54f742390f3ddc8ead72b104fff774",
            "platform": "csail",
            "offered_by": [{"name": "CSAIL"}],
            "topics": [{"name": "Computer Science"}],
            "image_src": "https://cap.csail.mit.edu/sites/Image%202%20-1024x890.jpeg",
            "runs": [
                {
                    "prices": [{"price": Decimal("2500")}],
                    "run_id": "d1b529e221af3773aeed635f593007d3",
                    "platform": "csail",
                    "image_src": "https://cap.csail.mit.edu/sites/Image%202%20-1024x890.jpeg",
                    "start_date": datetime.datetime(2020, 5, 6, 12, 0, tzinfo=pytz.utc),
                    "end_date": datetime.datetime(2020, 6, 17, 12, 0, tzinfo=pytz.utc),
                    "best_start_date": datetime.datetime(
                        2020, 5, 6, 12, 0, tzinfo=pytz.utc
                    ),
                    "best_end_date": datetime.datetime(
                        2020, 6, 17, 12, 0, tzinfo=pytz.utc
                    ),
                    "offered_by": [{"name": "CSAIL"}],
                    "title": title,
                    "url": "https://cap.csail.mit.edu/course-catalog/csail-course-detail",
                    "short_description": short_description,
                    "full_description": full_description,
                    "instructors": [
                        {"first_name": "Marcus", "last_name": "Aurelius"},
                        {"first_name": "Tiberius", "last_name": "Gracchus"},
                        {"first_name": "Gaius", "last_name": "Marius II"},
                    ],
                }
            ],
        }
    ]


@pytest.mark.parametrize(
    "html, price",
    [
        ["<div><strong>Price</strong>: $4,100</div>", Decimal("4100")],
        [
            "<strong>Price:</strong>$$75100  (excluding accommodations)",
            Decimal("75100"),
        ],
        ["<div><strong>Cost</strong>$4,100</div>", None],
        ["<div><strong>Price:</strong>TBD</div>", None],
    ],
)
def test__parse_price(html, price):
    """Test that __parse_price returns the expected value"""
    soup = BeautifulSoup(html, "html.parser")
    assert _parse_price(soup) == price


@pytest.mark.parametrize(
    "start_text, duration_text, expected_start, expected_end",
    [
        [
            "June 7, 2021",
            "8 weeks",
            datetime.datetime(2021, 6, 7, 12, tzinfo=pytz.utc),
            datetime.datetime(2021, 8, 2, 12, tzinfo=pytz.utc),
        ],
        ["TBD", "6 weeks", None, None],
        ["June 7, 2021", "8", datetime.datetime(2021, 6, 7, 12, tzinfo=pytz.utc), None],
        [
            "June 7, 2021",
            "eight weeks",
            datetime.datetime(2021, 6, 7, 12, tzinfo=pytz.utc),
            None,
        ],
    ],
)
def test__parse_dates(start_text, duration_text, expected_start, expected_end):
    """Test that _parse_dates returns correct start/end date values"""
    html = f'<div class="field--name-field-text-header">Starts {start_text}</div> \
              <div class="field--name-field-text-area"><p><strong>Length</strong>:{duration_text}</p></div>'
    soup = BeautifulSoup(html, "html.parser")
    if expected_start:
        assert _parse_run_dates(soup) == [(expected_start, expected_end)]
    else:
        assert _parse_run_dates(soup) is None


def test_bad_ssl_certificate(mocker):
    """Test that requests.get switches to http if an https URL throws an SSL error"""
    mock_get = mocker.patch(
        "course_catalog.etl.csail.requests.get",
        autospec=True,
        side_effect=[SSLError("Fake error"), mocker.Mock()],
    )
    url = "https://fake.edu"
    _unverified_cert_request(url)
    mock_get.assert_any_call(url)
    mock_get.assert_any_call(url.replace("https:", "http:"))


def test__parse_instructors_empty():
    """Test that an empty list is returned if the instructors div is not found"""
    soup = BeautifulSoup("<html></html>", "html.parser")
    assert _parse_instructors(soup) == []


def test__parse_image_empty():
    """Test that None is returned if the image tag is not found"""
    soup = BeautifulSoup("<html></html>", "html.parser")
    assert _parse_image(soup) is None
