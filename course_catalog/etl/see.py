"""Sloan course catalog ETL"""
import logging
import re
from datetime import datetime
from decimal import Decimal
from urllib.parse import urljoin

import pytz
import requests
from bs4 import BeautifulSoup as bs

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.utils import log_exceptions, generate_unique_id

OFFERED_BY = [{"name": OfferedBy.see.value}]
BASE_URL = "https://executive.mit.edu"
LISTING_URL = f"{BASE_URL}/open-enrollment"

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
                    {"name": topic.strip()}
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
    prices = []
    price_text = course.find("strong", text=re.compile(r"Tuition:.*")).parent.find(
        text=True, recursive=False
    )
    if price_text:
        price_match = re.search(r"([\d,]+)", price_text)
        if price_match:
            return [{"price": Decimal(price_match.group(0).replace(",", ""))}]
    return prices


def _parse_run_dates(course):
    """
    Extracts the start and end dates for each course run

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
        list of tuple: List of start and end date tuples for each course run

    """
    # Start and end dates in same month (Jun 18-19, 2020)
    pattern_1_month = re.compile(r"(\w+)\s+(\d+)-?(\d+)?,\s*(\d{4})$")
    # Start and end dates in different months, same year (Jun 18 - Jul 18, 2020)
    pattern_1_year = re.compile(r"(\w+)\s+(\d+)\s*\-\s*(\w+)\s+(\d+),\s*(\d{4})$")
    # Start and end dates in different years (Dec 21, 2020-Jan 10,2021)
    pattern_2_years = re.compile(
        r"(\w+)\s+(\d+),\s*(\d{4})\s*-\s*(\w+)\s+(\d+),\s*(\d{4})$"
    )
    date_strings = [
        rundate.strip() for rundate in course.findAll("li")[3].get_text().split("|")
    ]
    runs = []
    for date_string in date_strings:
        match = re.match(pattern_1_month, date_string)
        if match:
            start_date = datetime.strptime(
                f"{match.group(1)} {match.group(2)} {match.group(4)}", "%b %d %Y"
            )
            end_date = datetime.strptime(
                f"{match.group(1)} {match.group(3)} {match.group(4)}", "%b %d %Y"
            )
            runs.append(
                (start_date.replace(tzinfo=pytz.utc), end_date.replace(tzinfo=pytz.utc))
            )
            continue
        match = re.match(pattern_1_year, date_string)
        if match:
            start_date = datetime.strptime(
                f"{match.group(1)} {match.group(2)} {match.group(5)}", "%b %d %Y"
            )
            end_date = datetime.strptime(
                f"{match.group(3)} {match.group(4)} {match.group(5)}", "%b %d %Y"
            )
            runs.append(
                (start_date.replace(tzinfo=pytz.utc), end_date.replace(tzinfo=pytz.utc))
            )
            continue
        match = re.match(pattern_2_years, date_string)
        if match:
            start_date = datetime.strptime(
                f"{match.group(1)} {match.group(2)} {match.group(3)}", "%b %d %Y"
            )
            end_date = datetime.strptime(
                f"{match.group(4)} {match.group(5)} {match.group(6)}", "%b %d %Y"
            )
            runs.append(
                (start_date.replace(tzinfo=pytz.utc), end_date.replace(tzinfo=pytz.utc))
            )
    return runs


def _parse_instructors(details):
    """
    Extract instructor names from the course detail page

    Args:
        details(BeautifulSoup): BeautifulSoup instance for course details

    Returns:
        list of dict: List of first & last names of each instructor

    """
    instructors = [
        instructor.find("h2").get_text().split()
        for instructor in details.findAll("article", {"class": "faculty-article"})
    ]
    return [
        {"first_name": instructor[0], "last_name": instructor[1]}
        for instructor in instructors
    ]


def _parse_short_description(details):
    """
    Extract short description from the course detail page

    Args:
        details(BeautifulSoup): BeautifulSoup instance for course details

    Returns:
        str: Short course description

    """
    section = details.find("section", {"class": "lead-content block-inner"})
    [header.extract() for header in section.findAll("header")]
    [style.extract() for style in section.findAll("style")]
    return section.get_text(separator=u" ").replace("\n", " ").strip()


def _parse_full_description(details):
    """
    Extract long description from the course detail page

    Args:
        details(BeautifulSoup): BeautifulSoup instance for course details

    Returns:
        str: Long course description

    """
    desc_ps = details.find(
        "div", {"class": "course-brochure-details"}
    ).find_next_siblings("p")
    return "\n\n".join(p.get_text(separator=u" ").replace("\n", " ").strip() for p in desc_ps)


@log_exceptions(
    "Error extracting Sloan Executive Education catalog", exc_return_value=[]
)
def extract():
    """Loads the MIT Executive Education catalog data via BeautifulSoup"""
    soup = bs(requests.get(LISTING_URL).content, "html.parser")
    listings = soup.find("div", {"id": "title"}).findAll(
        "ul", {"class": "course-details"}
    )
    return [
        {
            "listing": listing,
            "details": bs(
                requests.get(
                    urljoin(BASE_URL, listing.find("a").get("href")),
                    "html.parser"
                ).content
            ),
        }
        for listing in listings
    ]


@log_exceptions(
    "Error transforming Sloan Executive Education catalog", exc_return_value=[]
)
def transform(courses):
    """Transform the Sloan Executive Education catalog data"""
    transformed = []
    for course in courses:
        listing = course["listing"]
        details = course["details"]
        link = listing.find("a")
        url = urljoin(BASE_URL, link.get("href"))
        title = link.get_text()
        run_dates = _parse_run_dates(listing)
        prices = _parse_price(listing)

        instructors = _parse_instructors(details)
        short_description = _parse_short_description(details)
        full_description = _parse_full_description(details)

        transformed.append(
            {
                "url": url,
                "title": title,
                "topics": _parse_topics(course),
                "short_description": short_description,
                "full_description": full_description,
                "course_id": generate_unique_id(url),
                "platform": PlatformType.see.value,
                "offered_by": [{"name": OfferedBy.see.value}],
                "runs": [
                    {
                        "prices": prices,
                        "run_id": generate_unique_id(
                            f"{url}{datetime.strftime(date_range[0], '%Y%m%d')}"
                        ),
                        "platform": PlatformType.see.value,
                        "start_date": date_range[0],
                        "end_date": date_range[1],
                        "best_start_date": date_range[0],
                        "best_end_date": date_range[1],
                        "offered_by": [{"name": OfferedBy.see.value}],
                        "title": title,
                        "short_description": short_description,
                        "full_description": full_description,
                        "instructors": instructors,
                    }
                    for date_range in run_dates
                ],
            }
        )
    return transformed
