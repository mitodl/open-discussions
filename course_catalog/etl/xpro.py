"""xPro course catalog ETL"""
import copy
import logging
from datetime import datetime

import pytz
import requests
from django.conf import settings

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.utils import transform_topics

log = logging.getLogger(__name__)


XPRO_DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

OFFERED_BY = [{"name": OfferedBy.xpro.value}]


def _parse_datetime(value):
    """
    Parses an xPro datetime string

    Args:
        value(str): the datetime in string format

    Returns:
        datetime: the parsed datetime
    """
    return (
        datetime.strptime(value, XPRO_DATETIME_FORMAT).replace(tzinfo=pytz.utc)
        if value
        else None
    )


def extract_programs():
    """Loads the xPro catalog data"""
    if settings.XPRO_CATALOG_API_URL:
        return requests.get(settings.XPRO_CATALOG_API_URL).json()
    return []


def extract_courses():
    """Loads the xPro catalog data"""
    if settings.XPRO_COURSES_API_URL:
        return requests.get(settings.XPRO_COURSES_API_URL).json()
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
        "run_id": course_run["courseware_id"],
        "platform": PlatformType.xpro.value,
        "start_date": _parse_datetime(course_run["start_date"]),
        "end_date": _parse_datetime(course_run["end_date"]),
        "enrollment_start": _parse_datetime(course_run["enrollment_start"]),
        "enrollment_end": _parse_datetime(course_run["enrollment_end"]),
        "best_start_date": _parse_datetime(course_run["enrollment_start"])
        or _parse_datetime(course_run["start_date"]),
        "best_end_date": _parse_datetime(course_run["enrollment_end"])
        or _parse_datetime(course_run["end_date"]),
        "offered_by": copy.deepcopy(OFFERED_BY),
        "published": bool(course_run["current_price"]),
        "prices": [{"price": course_run["current_price"]}]
        if course_run.get("current_price", None)
        else [],
        "instructors": [
            {"full_name": instructor["name"]}
            for instructor in course_run["instructors"]
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
        "platform": PlatformType.xpro.value,
        "title": course["title"],
        "image_src": course["thumbnail_url"],
        "offered_by": copy.deepcopy(OFFERED_BY),
        "short_description": course["description"],
        "published": any(
            map(
                lambda course_run: course_run.get("current_price", None),
                course["courseruns"],
            )
        ),
        "topics": transform_topics(course.get("topics", [])),
        "runs": [_transform_run(course_run) for course_run in course["courseruns"]],
    }


def transform_courses(courses):
    """
    Transforms a list of courses into our normalized data structure

    Args:
        courses (list of dict): courses data

    Returns:
        list of dict: normalized courses data
    """
    return [_transform_course(course) for course in courses]


def transform_programs(programs):
    """Transform the xPro catalog data"""
    # normalize the xPro data into the course_catalog/models.py data structures
    return [
        {
            "program_id": program["readable_id"],
            "title": program["title"],
            "image_src": program["thumbnail_url"],
            "short_description": program["description"],
            "offered_by": copy.deepcopy(OFFERED_BY),
            "published": bool(
                program["current_price"]
            ),  # a program is only considered published if it has a product/price
            "url": program["url"],
            "topics": transform_topics(program.get("topics", [])),
            "runs": [
                {
                    "prices": [{"price": program["current_price"], "mode": ""}]
                    if program.get("current_price", None)
                    else [],
                    "run_id": program["readable_id"],
                    "platform": PlatformType.xpro.value,
                    "enrollment_start": _parse_datetime(program["enrollment_start"]),
                    "start_date": _parse_datetime(program["start_date"]),
                    "end_date": _parse_datetime(program["end_date"]),
                    "best_start_date": _parse_datetime(program["enrollment_start"])
                    or _parse_datetime(program["start_date"]),
                    "best_end_date": _parse_datetime(program["end_date"]),
                    "offered_by": copy.deepcopy(OFFERED_BY),
                    "title": program["title"],
                    "short_description": program["description"],
                    "instructors": [
                        {"full_name": instructor["name"]}
                        for instructor in program.get("instructors", [])
                    ],
                }
            ],
            "courses": [_transform_course(course) for course in program["courses"]],
        }
        for program in programs
    ]
