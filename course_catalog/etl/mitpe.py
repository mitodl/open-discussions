"""MIT Professional course catalog ETL"""
import logging
import re
from datetime import datetime
from decimal import Decimal
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup as bs
from django.conf import settings

from course_catalog.constants import OfferedBy, PlatformType, mitpe_edx_mapping
from course_catalog.etl.utils import (
    generate_unique_id,
    strip_extra_whitespace,
    parse_dates,
    map_topics,
)
from course_catalog.models import Course

log = logging.getLogger()

OFFERED_BY = [{"name": OfferedBy.mitpe.value}]
PLATFORM = PlatformType.mitpe.value


def _parse_topics(course):
    """
    Extract topics for a course

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
          list of str: List of topic names

    """
    try:
        mitpe_topics = (
            course.find("div", {"class": "views-field-field-course-topics"})
            .find("div", {"class": "field-content"})
            .get_text()
            .split(",")
        )
    except AttributeError:
        return []
    return map_topics(mitpe_topics, mitpe_edx_mapping)


def _parse_price(course):
    """
    Extract the course price as a list

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
          Decimal: Price of course or None
    """
    try:
        price_text = course.find("div", {"class": "views-field-field-course-fee"}).text
    except AttributeError:
        return None
    price_match = re.search(r"([\d,]+)", price_text)
    if price_match:
        return Decimal(price_match.group(0).replace(",", ""))


def _parse_run_dates(course):
    """
    Extracts the start and end dates for each course run

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
        list of tuple: List of start and end date tuples for each course run

    """
    date_div = course.find("span", {"class": "date-display-range"})
    run_dates = []
    if date_div:
        dates = parse_dates(date_div.get_text())
        if dates:
            run_dates.append(dates)
    return run_dates


def _parse_instructors(course):
    """
    Extract instructor names from the course detail page

    Args:
        details(Tag): BeautifulSoup Tag for course details

    Returns:
        list of lists: List of first & last names of each instructor

    """
    return [
        instructor.get_text().split(" ", 1)
        for instructor in course.find(
            "div", {"class": "views-field-field-lead-instructors"}
        ).findAll("div", {"class": "field-content"})
    ]


def _parse_description(details):
    """
    Extract short description from the course detail page

    Args:
        details(Tag): BeautifulSoup Tag for course details

    Returns:
        list of str: List of course paragraph strings

    """
    div = details.find("div", {"class": "course-right"}).find(
        "div", {"class": "field--type-text-with-summary"}
    )
    # pylint: disable=expression-not-assigned
    [p.extract() for p in div.findAll("p", {"class": "special"})]
    paragraphs = []
    for child in div.findAll():
        if child.name == "p":
            paragraphs.append(child.text)
        elif child.name == "h3":
            break

    return paragraphs


def _has_existing_published_run(course_id):
    """
    Returns true if there's an existing published run for the course

    Args:
        course_id (str): the course id to check

    Returns:
        bool: True if such a course and run exists, False otherwise
    """
    course = Course.objects.filter(platform=PLATFORM, course_id=course_id).first()

    return bool(course) and course.runs.filter(published=True).exists()


def extract():
    """Loads the MIT Professional Education catalog data via BeautifulSoup"""
    if not settings.MITPE_BASE_URL:
        log.error("MIT Professional base URL not set, skipping ETL")
        return []
    courses = []
    soup = bs(
        requests.get(urljoin(settings.MITPE_BASE_URL, "/course-catalog")).content,
        "html.parser",
    )
    listings = soup.find("div", {"class": "course-listing"}).findAll(
        "div", {"class": "views-row"}
    )
    for listing in listings:
        link = listing.find("a")
        url = urljoin(settings.MITPE_BASE_URL, link.get("href"))
        details = bs(requests.get(url).content, "html.parser")
        description = _parse_description(details)
        short_description = strip_extra_whitespace(description[0])
        full_description = strip_extra_whitespace(" ".join(p for p in description))

        courses.append(
            {
                "url": url,
                "title": strip_extra_whitespace(link.get_text()),
                "dates": _parse_run_dates(listing),
                "price": _parse_price(listing),
                "topics": _parse_topics(listing),
                "instructors": _parse_instructors(listing),
                "short_description": short_description,
                "full_description": full_description,
            }
        )
    return courses


def transform_course(course):
    """Transform a single course"""
    course_id = generate_unique_id(course["url"])
    runs = [
        {
            "url": course["url"],
            "prices": ([{"price": course["price"]}] if course["price"] else []),
            "run_id": generate_unique_id(
                f"{course['url']}{datetime.strftime(date_range[0], '%Y%m%d')}"
            ),
            "platform": PLATFORM,
            "start_date": date_range[0],
            "end_date": date_range[1],
            "best_start_date": date_range[0],
            "best_end_date": date_range[1],
            "offered_by": OFFERED_BY,
            "title": course["title"],
            "short_description": course["short_description"],
            "full_description": course["full_description"],
            "instructors": [
                {"first_name": first_name, "last_name": last_name}
                for (first_name, last_name) in course["instructors"]
            ],
        }
        for date_range in course.get("dates", [])
    ]
    return {
        "url": course["url"],
        "title": course["title"],
        "topics": [{"name": topic} for topic in course["topics"]],
        "short_description": course["short_description"],
        "full_description": course["full_description"],
        "course_id": course_id,
        "platform": PLATFORM,
        "offered_by": OFFERED_BY,
        "published": bool(runs) or _has_existing_published_run(course_id),
        "runs": runs,
    }


def transform(courses):
    """Transform the MIT Professional Education course data"""
    return [transform_course(course) for course in courses]
