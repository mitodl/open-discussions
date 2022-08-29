"""xPro course catalog ETL"""
import copy
import logging
import os
import re
from datetime import datetime
from subprocess import CalledProcessError, check_call
from tempfile import TemporaryDirectory

import pytz
import requests
from django.conf import settings
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.loaders import load_content_files
from course_catalog.etl.utils import (
    get_learning_course_bucket,
    transform_content_files,
    transform_topics,
)
from course_catalog.models import Course, LearningResourceRun
from course_catalog.utils import get_s3_object_and_read

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


def sync_xpro_course_files(ids):
    """
    Sync all xPRO course run files for a list of course ids to database

    Args:
        ids(list of int): list of course ids to process
        bucket_name (str): The name of the bucket containing course file data
        platform (str): The platform of the course files
    """
    bucket = get_learning_course_bucket(settings.XPRO_LEARNING_COURSE_BUCKET_NAME)

    try:
        most_recent_export = next(
            reversed(
                sorted(
                    [
                        obj
                        for obj in bucket.objects.all()
                        if re.search(r"/exported_courses_\d+\.tar\.gz$", obj.key)
                    ],
                    key=lambda obj: obj.last_modified,
                )
            )
        )
    except StopIteration:
        log.warning("No xPRO exported courses found in xPRO S3 bucket")
        return

    course_content_type = ContentType.objects.get_for_model(Course)
    with TemporaryDirectory() as export_tempdir, TemporaryDirectory() as tar_tempdir:
        tarbytes = get_s3_object_and_read(most_recent_export)
        tarpath = os.path.join(export_tempdir, "temp.tar.gz")
        with open(tarpath, "wb") as f:
            f.write(tarbytes)

        try:
            check_call(["tar", "xf", tarpath], cwd=tar_tempdir)
        except CalledProcessError:
            log.exception("Unable to untar %s", most_recent_export)
            return

        for course_tarfile in os.listdir(tar_tempdir):
            matches = re.search(r"(.+)\.tar\.gz$", course_tarfile)
            if not matches:
                log.error(
                    "Expected a tar file in exported courses tarball but found %s",
                    course_tarfile,
                )
                continue
            run_id = matches.group(1)
            run = LearningResourceRun.objects.filter(
                platform=PlatformType.xpro.value,
                run_id=run_id,
                content_type=course_content_type,
                object_id__in=ids,
            ).first()
            if not run:
                log.info("No xPRO courses matched course tarfile %s", course_tarfile)
                continue

            course_tarpath = os.path.join(tar_tempdir, course_tarfile)
            try:
                load_content_files(run, transform_content_files(course_tarpath))
            except:  # pylint: disable=bare-except
                log.exception("Error ingesting OLX content data for %s", course_tarfile)
