"""xPro course catalog ETL"""
import copy
from datetime import datetime
import logging
import mimetypes
import os
from subprocess import check_call
from tempfile import TemporaryDirectory
import glob

from django.conf import settings
import requests
import pytz
from xbundle import XBundle

from course_catalog.constants import (
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_VERTICAL,
    OfferedBy,
    PlatformType,
    VALID_TEXT_FILE_TYPES,
)
from course_catalog.etl.utils import extract_text_metadata, log_exceptions
from course_catalog.models import get_max_length
from open_discussions.utils import get_s3_bucket, untar_to_tempdir


log = logging.getLogger(__name__)


XPRO_DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

OFFERED_BY = [{"name": OfferedBy.xpro.value}]


def get_xpro_learning_course_bucket():
    """
    Get the xPRO S3 Bucket

    Returns:
        boto3.Bucket: the S3 Bucket
    """
    return get_s3_bucket(settings.XPRO_LEARNING_COURSE_BUCKET_NAME)


def get_oll_olx_bucket():
    """
    Get the OLL OLX bucket

    Returns:
        boto3.Bucket: the S3 Bucket
    """
    return get_s3_bucket(settings.OLL_OLX_BUCKET_NAME)


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
    with untar_to_tempdir(course_tarpath) as inner_tempdir:
        olx_path = glob.glob(inner_tempdir + "/*")[0]
        for document, metadata in documents_from_olx(olx_path):
            key = metadata["key"]
            content_type = metadata["content_type"]
            mime_type = metadata.get("mime_type")
            tika_output = extract_text_metadata(
                document, other_headers={"Content-Type": mime_type} if mime_type else {}
            )

            if tika_output is None:
                log.info("No tika response for %s", key)
                continue

            tika_content = tika_output.get("content") or ""
            tika_metadata = tika_output.get("metadata") or {}
            content.append(
                {
                    "content": tika_content.strip(),
                    "key": key,
                    "content_title": (
                        metadata.get("title") or tika_metadata.get("title") or ""
                    )[: get_max_length("content_title")],
                    "content_author": (tika_metadata.get("Author") or "")[
                        : get_max_length("content_author")
                    ],
                    "content_language": (tika_metadata.get("language") or "")[
                        : get_max_length("content_language")
                    ],
                    "content_type": content_type,
                }
            )
    return content


def _infinite_counter():
    """Infinite counter"""
    count = 0
    while True:
        yield count
        count += 1


def _get_text_from_element(element, content):
    """
    Helper method to recurse through XML elements

    Args:
        element (Element): An XML element
        content (list): A list of strings, to be modified with any new material
    """
    if element.tag not in ("style", "script"):
        if element.text:
            content.append(element.text)

        for child in element.getchildren():
            _get_text_from_element(child, content)

        if element.tail:
            content.append(element.tail)


def get_text_from_element(element):
    """
    Get relevant text for ingestion from XML element

    Args:
        element (Element): A XML element representing a vertical
    """
    content = []
    _get_text_from_element(element, content)
    return " ".join(content)


def documents_from_olx(olx_path):  # pylint: disable=too-many-locals
    """
    Extract text from OLX directory

    Args:
        olx_path (str): The path to the directory with the OLX data

    Returns:
        list of tuple:
            A list of (bytes of content, metadata)
    """
    documents = []
    bundle = XBundle()
    bundle.import_from_directory(olx_path)
    for index, vertical in enumerate(bundle.course.findall(".//vertical")):
        content = get_text_from_element(vertical)

        documents.append(
            (
                content,
                {
                    "key": f"vertical_{index + 1}",
                    "content_type": CONTENT_TYPE_VERTICAL,
                    "title": vertical.attrib.get("display_name") or "",
                    "mime_type": "application/xml",
                },
            )
        )

    counter = _infinite_counter()

    for root, _, files in os.walk(olx_path):
        for filename in files:
            _, extension = os.path.splitext(filename)
            extension_lower = extension.lower()
            if extension_lower in VALID_TEXT_FILE_TYPES:
                with open(os.path.join(root, filename), "rb") as f:
                    filebytes = f.read()

                mimetype = mimetypes.types_map.get(extension_lower)

                documents.append(
                    (
                        filebytes,
                        {
                            "key": f"document_{next(counter)}_{filename}",
                            "content_type": CONTENT_TYPE_FILE,
                            "mime_type": mimetype,
                        },
                    )
                )

    return documents
