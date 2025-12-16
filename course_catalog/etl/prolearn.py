"""Prolearn course catalog ETL"""
import json
import re
from datetime import datetime
from decimal import Decimal
from urllib.parse import urljoin

import pytz
import requests
from django.conf import settings

from course_catalog.constants import OFFERED_BY_MAPPINGS, OfferedBy, PlatformType
from course_catalog.etl.utils import transform_topics

"""
 Dict of Prolearn "departments" that should be imported.
 Currently each department corresponds to an "offered by" value,
 prefixed with "MIT "
"""
PROLEARN_DEPARTMENT_MAPPING = {
    PlatformType.bootcamps.value: f"MIT {OfferedBy.bootcamps.value}",
    PlatformType.ctl.value: f"MIT {OfferedBy.ctl.value}",
    PlatformType.mitpe.value: f"MIT {OfferedBy.mitpe.value}",
    PlatformType.scc.value: f"MIT {OfferedBy.scc.value}",
    PlatformType.see.value: f"MIT {OfferedBy.see.value}",
    PlatformType.csail.value: f"MIT {OfferedBy.csail.value}",
}

# List of query fields for prolearn, deduced from its website api calls
PROLEARN_QUERY_FIELDS = "\n".join(
    [
        "title",
        "nid",
        "url",
        "certificate_name",
        "course_application_url",
        "course_link",
        "field_course_or_program",
        "start_value",
        "end_value",
        "department",
        "department_url",
        "body",
        "body_override",
        "field_time_commitment",
        "field_duration",
        "featured_image_url",
        "field_featured_video",
        "field_non_degree_credits",
        "field_price",
        "field_related_courses_programs",
        "related_courses_programs_title",
        "field_time_commitment",
        "ucc_hot_topic",
        "ucc_name",
        "ucc_tid",
        "application_process",
        "application_process_override",
        "format_name",
        "image_override_url",
        "video_override_url",
        "field_new_course_program",
        "field_tooltip",
    ]
)

# Performs the query made on https://prolearn.mit.edu/graphql, with a filter for program or course
PROLEARN_QUERY = """
query {
    searchAPISearch(
        index_id:\"default_solr_index\",
        range:{limit: 999, offset: 0},
        condition_group: {
            conjunction: AND,
            groups: [
                {
                    conjunction: AND,
                    conditions: [
                        {operator: \"=\", name: \"field_course_or_program\", value: \"%s\"}
                        {operator: \"=\", name: \"department\", value: \"%s\"}
                    ]
                }
            ]
        }
    ) {
        result_count
         documents {... on DefaultSolrIndexDoc {%s}}
    }
}
"""


def parse_offered_by(document: dict) -> str:
    """Get a properly formatted offered_by value for a course/program

    Args:
        document: course or program data

    Returns:
        str: offered_by value

    """
    department = document["department"].lstrip("MIT").strip()
    return (
        department if department in [offered.value for offered in OfferedBy] else None
    )


def parse_date(num) -> datetime:
    """Get a datetime value from an list containing one integer

    Args:
        list of int: list containing one integer

    Returns:
        datetime: start or end date

    """
    if num:
        return datetime.fromtimestamp(num, tz=pytz.UTC)


def parse_price(document: dict) -> Decimal:
    """Get a Decimal value for a course/program price

    Args:
        document: course or program data

    Returns:
        Decimal: price of the course/program

    """
    price_str = (
        re.sub(r"[^\d.]", "", document["field_price"])
        if document.get("field_price") is not None
        else ""
    )
    return [{"price": round(Decimal(price_str), 2)}] if price_str else []


def parse_topic(document: dict) -> list[dict]:
    """Get a list containing one {"name": <topic>} dict object

    Args:
        document: course or program data

    Returns:
        list of dict: list containing one topic dict with a name attribute

    """
    topic = document.get("ucc_name")
    return transform_topics([{"name": topic}]) if topic else []


def parse_image(document: dict) -> str:
    """Get a full url for a course/program image

    Args:
        document: course or program data

    Returns:
        str: full url of image src

    """
    url = document.get("featured_image_url")
    return urljoin(settings.PROLEARN_CATALOG_API_URL, url) if url else None


def parse_url(document: dict) -> str:
    """Get a full url for a course/program.
    Order of preference: course_link, course_application_url, url

    Args:
        document: course or program data

    Returns:
        str: full url of the course or program

    """
    return (
        document["course_link"] or document["course_application_url"] or document["url"]
    )


def extract_data(course_or_program: str, platform: str) -> list[dict]:
    """Queries the prolearn api url for either courses or programs from a department, and returns the results

    Args:
        course_or_program (str): "course" or "program"
        platform (str): The platform to filter by

    Returns:
        list of dict: courses or programs

    """
    if settings.PROLEARN_CATALOG_API_URL:
        department = PROLEARN_DEPARTMENT_MAPPING.get(platform)
        response = requests.post(
            settings.PROLEARN_CATALOG_API_URL,
            data=json.dumps(
                {
                    "query": PROLEARN_QUERY
                    % (course_or_program, department, PROLEARN_QUERY_FIELDS)
                }
            ),
        ).json()
        return response["data"]["searchAPISearch"]["documents"]
    return []


def extract_programs(department: str) -> list[dict]:
    """Query the ProLearn catalog data for programs

    Returns:
        list of dict: programs

    """
    return extract_data("program", department)


def extract_courses(department: str) -> list[dict]:
    """Query the ProLearn catalog data for courses

    Returns:
        list of dict: courses

    """
    return extract_data("course", department)


def transform_programs(programs: list[dict]) -> list[dict]:
    """Transform the prolearn catalog data for programs into a format suitable for saving to the database

    Args:
        programs: list of programs as dicts

    Returns:
        list of dict: List of programs as transformed dicts

    """
    # normalize the prolearn data into the course_catalog/models.py data structures
    return [
        {
            "program_id": program["nid"],
            "title": program["title"],
            "url": parse_url(program),
            "image_src": parse_image(program),
            "offered_by": [{"name": parse_offered_by(program)}],
            "runs": [
                {
                    "run_id": f'{program["nid"]}_{start_value}',
                    "platform": OFFERED_BY_MAPPINGS[parse_offered_by(program)],
                    "title": program["title"],
                    "offered_by": [{"name": parse_offered_by(program)}],
                    "prices": parse_price(program),
                    "start_date": parse_date(start_value),
                    "end_date": parse_date(end_value),
                    "best_start_date": parse_date(start_value),
                    "best_end_date": parse_date(end_value),
                }
                for (start_value, end_value) in zip(
                    program["start_value"], program["end_value"]
                )
            ],
            "topics": parse_topic(program),
            # all we need for course data is the relative positioning of courses by course_id
            "courses": [
                {
                    "course_id": course_id,
                    "platform": OFFERED_BY_MAPPINGS[parse_offered_by(program)],
                    "offered_by": [{"name": parse_offered_by(program)}],
                    "runs": [
                        {
                            "run_id": course_id,
                            "platform": OFFERED_BY_MAPPINGS[parse_offered_by(program)],
                            "offered_by": [{"name": parse_offered_by(program)}],
                        }
                    ],
                }
                for course_id in sorted(program["field_related_courses_programs"])
            ],
        }
        for program in programs
    ]


def _transform_runs(course_run: dict) -> dict:
    """Transforms a course run into our normalized data structure

    Args:
        course_run (dict): course run data

    Returns:
        dict: normalized course run data

    """
    return [
        {
            "run_id": f'{course_run["nid"]}_{start_value}',
            "title": course_run["title"],
            "image_src": parse_image(course_run),
            "offered_by": [{"name": parse_offered_by(course_run)}],
            "short_description": course_run["body"],
            "platform": OFFERED_BY_MAPPINGS[parse_offered_by(course_run)],
            "start_date": parse_date(start_value),
            "end_date": parse_date(end_value),
            "best_start_date": parse_date(start_value),
            "best_end_date": parse_date(end_value),
            "published": True,
            "prices": parse_price(course_run),
            "url": parse_url(course_run),
            "raw_json": course_run,
        }
        for (start_value, end_value) in zip(
            course_run["start_value"], course_run["end_value"]
        )
    ]


def _transform_course(course: dict) -> dict:
    """Transforms a course into our normalized data structure

    Args:
        course (dict): course data

    Returns:
        dict: normalized course data

    """
    return {
        "course_id": course["nid"],
        "platform": OFFERED_BY_MAPPINGS[parse_offered_by(course)],
        "title": course["title"],
        "image_src": parse_image(course),
        "offered_by": [{"name": parse_offered_by(course)}],
        "short_description": course["body"],
        "published": True,
        "topics": parse_topic(course),
        "runs": _transform_runs(course),
    }


def transform_courses(courses: list[dict]) -> list[dict]:
    """Transforms a list of courses into our normalized data structure

    Args:
        courses (list of dict): courses data

    Returns:
        list of dict: normalized courses data

    """
    return [_transform_course(course) for course in courses]
