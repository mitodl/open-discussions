"""Sloan course catalog ETL"""
import logging
import re
from datetime import datetime
from decimal import Decimal
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup as bs
from django.conf import settings

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.utils import (
    log_exceptions,
    generate_unique_id,
    strip_extra_whitespace,
    parse_dates,
)

OFFERED_BY = [{"name": OfferedBy.see.value}]

log = logging.getLogger()


def _parse_topics(course):
    """
    Extract topics for a course

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
          list of str: List of topic names

    """
    topics = []
    for classname in ("primary-topics", "secondary-topics"):
        try:
            topics.extend(
                [
                    strip_extra_whitespace(topic)
                    for topic in course.find("span", {"class": classname})
                    .parent.find(text=True, recursive=False)
                    .split(",")
                ]
            )
        except AttributeError:
            pass
    return topics


def _parse_price(course):
    """
    Extract the course price as a list

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
          list of int: List containing 1 integer (or empty)
    """
    price = None
    price_text = course.find("strong", text=re.compile(r"Tuition:.*")).parent.find(
        text=True, recursive=False
    )
    if price_text:
        price_match = re.search(r"([\d,]+)", price_text)
        if price_match:
            return Decimal(price_match.group(0).replace(",", ""))
    return price


def _parse_run_dates(course):
    """
    Extracts the start and end dates for each course run

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
        list of tuple: List of start and end date tuples for each course run

    """
    date_strings = [
        rundate.strip() for rundate in course.findAll("li")[3].get_text().split("|")
    ]
    run_dates = []
    for date_string in date_strings:
        run_dates.append(parse_dates(date_string))
    return [run_date for run_date in run_dates if run_date is not None]


def _parse_instructors(details):
    """
    Extract instructor names from the course detail page

    Args:
        details(Tag): BeautifulSoup Tag for course details

    Returns:
        list of dict: List of first & last names of each instructor

    """
    return [
        instructor.find("h2").get_text().split(" ", 1)
        for instructor in details.findAll("article", {"class": "faculty-article"})
    ]


def _parse_short_description(details):
    """
    Extract short description from the course detail page

    Args:
        details(Tag): BeautifulSoup Tag for course details

    Returns:
        str: Short course description

    """
    section = details.find("section", {"class": "lead-content block-inner"})
    # pylint: disable=expression-not-assigned
    [header.extract() for header in section.findAll("header")]
    # pylint: disable=expression-not-assigned
    [style.extract() for style in section.findAll("style")]
    return strip_extra_whitespace(section.get_text(separator=" ").strip())


def _parse_full_description(details):
    """
    Extract long description from the course detail page

    Args:
        details(Tag): BeautifulSoup Tag for course details

    Returns:
        str: Long course description

    """
    desc_ps = details.find(
        "div", {"class": "course-brochure-details"}
    ).find_next_siblings("p")
    return strip_extra_whitespace(
        " ".join(p.get_text(separator=" ").strip() for p in desc_ps)
    )


@log_exceptions(
    "Error extracting Sloan Executive Education catalog", exc_return_value=[]
)
def extract():
    """Loads the MIT Executive Education catalog data via BeautifulSoup"""
    if not settings.SEE_BASE_URL:
        log.error("Sloan base URL not set, skipping ETL")
        return []
    courses = []
    soup = bs(
        requests.get(urljoin(settings.SEE_BASE_URL, "/open-enrollment")).content,
        "html.parser",
    )
    listings = soup.find("div", {"id": "title"}).findAll(
        "ul", {"class": "course-details"}
    )
    for listing in listings:
        link = listing.find("a")
        url = urljoin(settings.SEE_BASE_URL, link.get("href"))
        details = bs(
            requests.get(urljoin(settings.SEE_BASE_URL, url)).content, "html.parser"
        )
        courses.append(
            {
                "url": url,
                "title": strip_extra_whitespace(link.get_text()),
                "dates": _parse_run_dates(listing),
                "price": _parse_price(listing),
                "topics": _parse_topics(listing),
                "instructors": _parse_instructors(details),
                "short_description": _parse_short_description(details),
                "full_description": _parse_full_description(details),
            }
        )
    return courses


@log_exceptions(
    "Error transforming Sloan Executive Education catalog", exc_return_value=[]
)
def transform(courses):
    """Transform the Sloan Executive Education course data"""
    return [
        {
            "url": course["url"],
            "title": course["title"],
            "topics": [{"name": topic} for topic in course["topics"]],
            "short_description": course["short_description"],
            "full_description": course["full_description"],
            "course_id": generate_unique_id(course["url"]),
            "platform": PlatformType.see.value,
            "offered_by": [{"name": OfferedBy.see.value}],
            "runs": [
                {
                    "url": course["url"],
                    "prices": ([{"price": course["price"]}] if course["price"] else []),
                    "run_id": generate_unique_id(
                        f"{course['url']}{datetime.strftime(date_range[0], '%Y%m%d')}"
                    ),
                    "platform": PlatformType.see.value,
                    "start_date": date_range[0],
                    "end_date": date_range[1],
                    "best_start_date": date_range[0],
                    "best_end_date": date_range[1],
                    "offered_by": [{"name": OfferedBy.see.value}],
                    "title": course["title"],
                    "short_description": course["short_description"],
                    "full_description": course["full_description"],
                    "instructors": [
                        {"first_name": first_name, "last_name": last_name}
                        for (first_name, last_name) in course["instructors"]
                    ],
                }
                for date_range in course["dates"]
            ],
        }
        for course in courses
    ]
