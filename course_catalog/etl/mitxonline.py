"""MITX Online course catalog ETL"""
import copy
import logging
import re
from datetime import datetime
from urllib.parse import urljoin

import pytz
import requests
from django.conf import settings

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.utils import transform_topics, extract_valid_department_from_id

log = logging.getLogger(__name__)


MITX_ONLINE_DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

EXCLUDE_REGEX = r"PROCTORED EXAM"

OFFERED_BY = [{"name": OfferedBy.mitx.value}]


def _parse_datetime(value):
    """
    Parses an MITx Online datetime string

    Args:
        value(str): the datetime in string format

    Returns:
        datetime: the parsed datetime
    """
    return (
        datetime.strptime(value, MITX_ONLINE_DATETIME_FORMAT).replace(tzinfo=pytz.utc)
        if value
        else None
    )


def parse_page_attribute(mitx_json, attribute, is_url=False, is_list=False):
    """
    Extracts an MITX Online page attribute

    Args:
        mitx_json(dict): the course/run/program JSON object containing the page element
        attribute(str): the name of the attribute to extract
        is_url(bool): True if the attribute is a url
        is_list(bool): True if the attribute is a list

    Returns:
        str or list or None: The attribute value
    """
    default_value = [] if is_list else None
    page = mitx_json.get("page", {}) or {}
    attribute = page.get(attribute, default_value)
    if attribute:
        return (
            urljoin(settings.MITX_ONLINE_BASE_URL, attribute) if is_url else attribute
        )
    return default_value


def extract_programs():
    """Loads the MITx Online catalog data"""
    if settings.MITX_ONLINE_PROGRAMS_API_URL:
        return requests.get(settings.MITX_ONLINE_PROGRAMS_API_URL).json()
    return []


def extract_courses():
    """Loads the MITx Online catalog data"""
    if settings.MITX_ONLINE_COURSES_API_URL:
        return requests.get(settings.MITX_ONLINE_COURSES_API_URL).json()
    return []


def _transform_run(course_run):
    """
    Transforms a course run into our normalized data structure

    Args:
        course_run (dict): course run data

    Returns:
        dict: normalized course run data
    """
    return {
        "title": course_run["title"],
        "run_id": course_run["courseware_id"],
        "platform": PlatformType.mitxonline.value,
        "start_date": _parse_datetime(course_run["start_date"]),
        "end_date": _parse_datetime(course_run["end_date"]),
        "enrollment_start": _parse_datetime(course_run["enrollment_start"]),
        "enrollment_end": _parse_datetime(course_run["enrollment_end"]),
        "best_start_date": _parse_datetime(course_run["enrollment_start"])
        or _parse_datetime(course_run["start_date"]),
        "best_end_date": _parse_datetime(course_run["enrollment_end"])
        or _parse_datetime(course_run["end_date"]),
        "offered_by": copy.deepcopy(OFFERED_BY),
        "url": parse_page_attribute(course_run, "page_url", is_url=True),
        "published": bool(parse_page_attribute(course_run, "page_url")),
        "short_description": parse_page_attribute(course_run, "description"),
        "image_src": parse_page_attribute(course_run, "feature_image_src", is_url=True),
        "prices": [
            {"price": price}
            for price in [parse_page_attribute(course_run, "current_price")]
            if price is not None
        ],
        "instructors": [
            {"full_name": instructor["name"]}
            for instructor in parse_page_attribute(
                course_run, "instructors", is_list=True
            )
        ],
    }


def _transform_course(course):
    """
    Transforms a course into our normalized data structure

    Args:
        course (dict): course data

    Returns:
        dict: normalized course data
    """
    return {
        "course_id": course["readable_id"],
        "platform": PlatformType.mitxonline.value,
        "department": extract_valid_department_from_id(course["readable_id"]),
        "title": course["title"],
        "offered_by": copy.deepcopy(OFFERED_BY),
        "topics": transform_topics(course.get("topics", [])),
        "runs": [_transform_run(course_run) for course_run in course["courseruns"]],
        "published": bool(
            parse_page_attribute(course, "page_url")
        ),  # a course is only considered published if it has a page url
        "image_src": parse_page_attribute(course, "feature_image_src", is_url=True),
        "url": parse_page_attribute(course, "page_url", is_url=True),
        "short_description": parse_page_attribute(course, "description"),
    }


def transform_courses(courses):
    """
    Transforms a list of courses into our normalized data structure

    Args:
        courses (list of dict): courses data

    Returns:
        list of dict: normalized courses data
    """
    return [
        _transform_course(course)
        for course in courses
        if not re.search(EXCLUDE_REGEX, course["title"], re.IGNORECASE)
    ]


def transform_programs(programs):
    """Transform the MITX Online catalog data"""
    # normalize the MITx Online data into the course_catalog/models.py data structures
    return [
        {
            "program_id": program["readable_id"],
            "title": program["title"],
            "offered_by": copy.deepcopy(OFFERED_BY),
            "topics": transform_topics(program.get("topics", [])),
            "short_description": parse_page_attribute(program, "description"),
            "url": parse_page_attribute(program, "page_url", is_url=True),
            "image_src": parse_page_attribute(
                program, "feature_image_src", is_url=True
            ),
            "published": bool(
                parse_page_attribute(program, "page_url")
            ),  # a program is only considered published if it has a page url
            "runs": [
                {
                    "run_id": program["readable_id"],
                    "platform": PlatformType.mitxonline.value,
                    "enrollment_start": _parse_datetime(program["enrollment_start"]),
                    "start_date": _parse_datetime(program["start_date"]),
                    "end_date": _parse_datetime(program["end_date"]),
                    "best_start_date": _parse_datetime(program["enrollment_start"])
                    or _parse_datetime(program["start_date"]),
                    "best_end_date": _parse_datetime(program["end_date"]),
                    "offered_by": copy.deepcopy(OFFERED_BY),
                    "title": program["title"],
                    "published": bool(
                        parse_page_attribute(program, "page_url")
                    ),  # a program is only considered published if it has a product/price
                    "url": parse_page_attribute(program, "page_url", is_url=True),
                    "image_src": parse_page_attribute(
                        program, "feature_image_src", is_url=True
                    ),
                    "short_description": parse_page_attribute(program, "description"),
                }
            ],
            "courses": [
                _transform_course(course)
                for course in program["courses"]
                if not re.search(EXCLUDE_REGEX, course["title"], re.IGNORECASE)
            ],
        }
        for program in programs
    ]
