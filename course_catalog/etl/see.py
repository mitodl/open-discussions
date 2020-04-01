"""MicroMasters course catalog ETL"""
import logging
import re
from datetime import datetime
from decimal import Decimal
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup as bs

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.utils import log_exceptions, generate_unique_id

OFFERED_BY = [{"name": OfferedBy.see.value}]
BASE_URL = "https://executive.mit.edu"

log = logging.getLogger()


def _extract_topics(course):
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


def _extract_price(course):
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


def _extract_run_dates(course):
    """
    Extracts the start and end dates for each course run

    Args:
        course(Tag): The BeautifulSoup tag containing course data

    Returns:
        list of tuple: List of start and end date tuples for each course run

    """
    pattern_1_month = re.compile(r"(\w+)\s+(\d+)-?(\d+)?,\s*(\d{4})$")
    pattern_1_year = re.compile(r"(\w+)\s+(\d+)\s*\-\s*(\w+)\s+(\d+),\s*(\d{4})$")
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
            runs.append((start_date, end_date))
            continue
        match = re.match(pattern_1_year, date_string)
        if match:
            start_date = datetime.strptime(
                f"{match.group(1)} {match.group(2)} {match.group(5)}", "%b %d %Y"
            )
            end_date = datetime.strptime(
                f"{match.group(3)} {match.group(4)} {match.group(5)}", "%b %d %Y"
            )
            runs.append((start_date, end_date))
            continue
        match = re.match(pattern_2_years, date_string)
        if match:
            start_date = datetime.strptime(
                f"{match.group(1)} {match.group(2)} {match.group(3)}", "%b %d %Y"
            )
            end_date = datetime.strptime(
                f"{match.group(4)} {match.group(5)} {match.group(6)}", "%b %d %Y"
            )
            runs.append((start_date, end_date))
    return runs


def _extract_instructors(url):
    """
    Extract instructor names from the course detail page

    Args:
        url(str): The URL of the course detail page

    Returns:
        list of dict: List of first & last names of each instructor

    """
    detail_page = requests.get(urljoin(BASE_URL, url), timeout=10)
    soup = bs(detail_page.content, "html.parser")
    instructors = [
        instructor.find("h2").get_text().split()
        for instructor in soup.findAll("article", {"class": "faculty-article"})
    ]
    return [
        {"first_name": instructor[0], "last_name": instructor[1]}
        for instructor in instructors
    ]


@log_exceptions("Error extracting MIT Executive Education catalog", exc_return_value=[])
def extract():
    """Loads the MIT Executive Education catalog data via BeautifulSoup"""
    resp = requests.get(urljoin(BASE_URL, "/open-enrollment"))
    soup = bs(resp.content, "html.parser")
    return soup.find("div", {"id": "title"}).findAll("ul", {"class": "course-details"})


@log_exceptions("Error extracting MIT Executive Education catalog", exc_return_value=[])
def transform(courses):
    """Transform the MIT Executive Education catalog data"""
    transformed = []
    for course in courses:
        link = course.find("a")
        url = link.get("href")
        title = link.get_text()
        description = course.find(
            "strong", text=re.compile(r"Description:.*")
        ).parent.find(text=True, recursive=False)
        run_dates = _extract_run_dates(course)
        instructors = _extract_instructors(url)
        prices = _extract_price(course)

        transformed.append(
            {
                "url": url,
                "title": title,
                "topics": _extract_topics(course),
                "short_description": description,
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
                        "short_description": description,
                        "instructors": instructors,
                    }
                    for date_range in run_dates
                ],
            }
        )
    return transformed
