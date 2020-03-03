"""xPro course catalog ETL"""
import copy
from datetime import datetime
from subprocess import check_call, check_output
from tempfile import TemporaryDirectory

import boto3
from django.conf import settings
import requests
import pytz

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.utils import extract_text_metadata, log_exceptions


XPRO_DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

OFFERED_BY = [{"name": OfferedBy.xpro.value}]


def get_xpro_learning_course_bucket():
    """
    Get the xPRO S3 Bucket

    Returns:
        boto3.Bucket: the OCW S3 Bucket or None
    """
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.XPRO_LEARNING_COURSE_ACCESS_KEY,
        aws_secret_access_key=settings.XPRO_LEARNING_COURSE_SECRET_ACCESS_KEY,
    )
    return s3.Bucket(name=settings.XPRO_LEARNING_COURSE_BUCKET_NAME)


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


@log_exceptions("Error extracting xPro catalog", exc_return_value=[])
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
        "topics": course.get("topics", []),
        "runs": [_transform_run(course_run) for course_run in course["courseruns"]],
    }


@log_exceptions("Error transforming xPro courses", exc_return_value=[])
def transform_courses(courses):
    """
    Transforms a list of courses into our normalized data structure

    Args:
        courses (list of dict): courses data

    Returns:
        list of dict: normalized courses data
    """
    # NOTE: don't use this in `transform_programs`, because this is wrapped in `log_exceptions`
    return [_transform_course(course) for course in courses]


@log_exceptions("Error transforming xPro programs", exc_return_value=[])
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
            "topics": program.get("topics", []),
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


def transform_content_files(course_tarpath):
    """
    Pass content to tika, then return a JSON document with the transformed content inside it

    Args:
        course_tarpath (str): The path to the tarball which contains the OLX
    """

    content = []
    with TemporaryDirectory() as inner_tempdir:
        check_call(["tar", "xf", course_tarpath], cwd=inner_tempdir)

        for document, key in documents_from_olx(inner_tempdir):
            tika_output = extract_text_metadata(document).get("content") or ""
            content.append({"content": tika_output.strip(), "key": key})
    return content


def documents_from_olx(olx_path):
    """
    Extract text from OLX directory

    Args:
        olx_path (str): The path to the directory with the OLX data

    Returns:
        list of tuple:
            A list of (str of content, unique key for document)
    """
    document = check_output(
        ["find", "-name", "*.xml", "-o", "-name", "*.html", "-exec", "cat", "{}", ";"],
        cwd=olx_path,
    ).decode()
    return [(document, olx_path)]
