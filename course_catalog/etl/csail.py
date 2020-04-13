"""CSAIL course catalog ETL"""
import logging
import re

from datetime import datetime, timedelta
from decimal import Decimal
from urllib.parse import urljoin

import pytz
import requests
from bs4 import BeautifulSoup as bs
from django.conf import settings

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.utils import (
    log_exceptions,
    generate_unique_id,
    strip_extra_whitespace,
)

OFFERED_BY = [{"name": OfferedBy.csail.value}]
PLATFORM = PlatformType.csail.value

log = logging.getLogger()


def _unverified_cert_request(url):
    """
    CSAIL currently has an unverified SSL certificate.  Try requesting the https URL anyway,
    in case it gets fixed soon, but if it fails revert to http.

    Args:
        url(str): The CSAIL URL to request

    Returns:
        HttpResponse: the response
    """
    try:
        return requests.get(url)
    except requests.exceptions.SSLError:
        return requests.get(url.replace("https:", "http:"))


def _parse_image(course):
    """
    Extract image src for a course

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
          str: image src URL
    """
    try:
        return (
            course.find("div", {"class": "field--name-field-media-image"})
            .find("img")
            .get("src")
        )
    except AttributeError:
        return None


def _parse_price(details):
    """
    Extract the course price

    Args:
        details(Tag): The BeautifulSoup tag containing course details

    Returns:
          Decimal: Price of course or None
    """
    try:
        price_text = details.find("strong", text=re.compile(r"Price")).parent.get_text()
    except AttributeError:
        return None
    price_match = re.search(r"([\d,]+)", price_text)
    if price_match:
        return Decimal(price_match.group(0).replace(",", ""))


def _parse_run_dates(details):
    """
    Extract a pair of dates from a start date string and duration string

    Args:
        start(str): A string containing start date
        duration(str): A string containing duration in weeks

    Returns:
        tuple of datetime: Start and end datetimes
    """
    start = details.find("div", {"class": "field--name-field-text-header"}).get_text()
    duration = details.find("strong", text=re.compile(r"Length")).parent.get_text()
    start_match = re.search(
        r"(?P<start_m>\w+)\s+(?P<start_d>\d+),\s*(?P<year>\d{4})", start
    )
    duration_match = re.search(r"(\d+)\s+weeks", duration) if duration else None
    if start_match:
        end_date = None
        start_date = datetime.strptime(
            f"{start_match.group('start_m')} {start_match.group('start_d')} {start_match.group('year')}",
            f"%B %d %Y",
        ).replace(hour=12, tzinfo=pytz.utc)

        if duration_match:
            weeks = int(duration_match.group(1))
            end_date = (start_date + timedelta(weeks=weeks)).replace(
                hour=12, tzinfo=pytz.utc
            )
        return [(start_date, end_date)]


def _parse_instructors(details):
    """
    Extract instructor names from the course detail page

    Args:
        details(Tag): BeautifulSoup Tag for course details

    Returns:
        list of dict: List of first & last names of each instructor

    """
    try:
        instructors = details.findAll(
            "div", {"class": "field--name-field-learn-more-links"}
        )[-1].findAll("div", {"class": "field__item"})
        return [
            instructor.get_text().strip().split(",", 1)[0].split(" ", 1)
            for instructor in instructors
        ]
    except (AttributeError, IndexError):
        return []


def _parse_short_description(course):
    """
    Extract short description from the listing

    Args:
        course(Tag): BeautifulSoup Tag for course listing

    Returns:
        str: Short course description

    """
    return strip_extra_whitespace(
        course.find("div", {"class": "field--type-text-with-summary"}).get_text()
    )


def _parse_full_description(details):
    """
    Extract full description from the course detail page.  The HTML formatting requires jumping through some hoops.

    Args:
        details(Tag): BeautifulSoup Tag for course details

    Returns:
        str: Full course description
    """
    p_texts = []
    last_strong = details.findAll("strong")[-1]
    last_strong_p = last_strong.parent
    p_texts.append(re.sub(r"^\w+:\s*\w+\n", "", last_strong_p.get_text()))
    for p in last_strong_p.find_next_siblings("p"):
        p_texts.append(p.get_text())
    return strip_extra_whitespace(" ".join([p for p in p_texts]))


@log_exceptions("Error extracting CSAIL catalog", exc_return_value=[])
def extract():
    """Loads the CSAIL catalog data via BeautifulSoup"""
    if not settings.CSAIL_BASE_URL:
        log.error("CSAIL base URL not set, skipping ETL")
        return []
    courses = []
    soup = bs(
        _unverified_cert_request(
            urljoin(settings.CSAIL_BASE_URL, "/professional-programs")
        ).content,
        "html.parser",
    )
    listings = soup.find("div", {"class": "view-events-programs"}).findAll(
        "div", {"class": "views-row"}
    )
    for listing in listings:
        link = listing.find("div", {"class": "faux-title"}).find("a")
        url = link.get("href")
        # Some external courses/programs might be here, ignore them for now
        if url.startswith(settings.CSAIL_BASE_URL):
            details = bs(_unverified_cert_request(url).content, "html.parser")
            courses.append(
                {
                    "url": url,
                    "title": strip_extra_whitespace(link.get_text()),
                    "dates": _parse_run_dates(details),
                    "price": _parse_price(details),
                    "instructors": _parse_instructors(details),
                    "short_description": _parse_short_description(listing),
                    "full_description": _parse_full_description(details),
                    "image_src": urljoin(
                        settings.CSAIL_BASE_URL, _parse_image(listing)
                    ),
                }
            )
    return courses


@log_exceptions("Error transforming CSAIL catalog", exc_return_value=[])
def transform(courses):
    """Transform the CSAIL course data"""
    return [
        {
            "url": course["url"],
            "title": course["title"],
            "short_description": course["short_description"],
            "full_description": course["full_description"],
            "course_id": generate_unique_id(course["url"]),
            "platform": PLATFORM,
            "offered_by": OFFERED_BY,
            "topics": [{"name": "Computer Science"}],
            "image_src": course["image_src"],
            "runs": [
                {
                    "url": course["url"],
                    "prices": ([{"price": course["price"]}] if course["price"] else []),
                    "run_id": generate_unique_id(
                        f"{course['url']}{datetime.strftime(start_date, '%Y%m%d')}"
                    ),
                    "platform": PLATFORM,
                    "start_date": start_date,
                    "end_date": end_date,
                    "best_start_date": start_date,
                    "best_end_date": end_date,
                    "offered_by": OFFERED_BY,
                    "title": course["title"],
                    "short_description": course["short_description"],
                    "full_description": course["full_description"],
                    "instructors": [
                        {"first_name": first_name, "last_name": last_name}
                        for (first_name, last_name) in course["instructors"]
                    ],
                    "image_src": course["image_src"],
                }
                for (start_date, end_date) in course["dates"]
            ],
        }
        for course in courses
        if course["dates"]
    ]
