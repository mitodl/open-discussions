"""
course_catalog api functions
"""
import json
import logging
from datetime import datetime

import pytz

from django.db import transaction
from django.conf import settings
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import (
    PlatformType,
    NON_COURSE_DIRECTORIES,
    AvailabilityType,
    OfferedBy,
)
from course_catalog.models import Bootcamp, CourseRun
from course_catalog.serializers import (
    BootcampSerializer,
    CourseRunSerializer,
    OCWSerializer,
)
from course_catalog.utils import get_course_url
from search.task_helpers import upsert_course, index_new_bootcamp, update_bootcamp

log = logging.getLogger(__name__)


def safe_load_json(json_string, json_file_key):
    """
    Loads the passed string as a JSON object with exception handing and logging.
    Some OCW JSON content may be malformed.

    Args:
        json_string (str): The JSON contents as a string
        json_file_key (str): file ID for the JSON file

    Returns:
        JSON (dict): the JSON contents as JSON
    """
    try:
        loaded_json = json.loads(json_string)
        return loaded_json
    except json.JSONDecodeError:
        log.exception("%s has a corrupted JSON", json_file_key)
        return {}


def digest_ocw_course(
    master_json, last_modified, course_instance, is_published, course_prefix=""
):
    """
    Takes in OCW course master json to store it in DB

    Args:
        master_json (dict): course master JSON object as an output from ocw-data-parser
        last_modified (datetime): timestamp of latest modification of all course files
        course_instance (Course): Course instance if exists, otherwise None
        is_published (bool): Flags OCW course as published or not
        course_prefix (str): (Optional) String used to query S3 bucket for course raw JSONs
    """

    ocw_serializer = OCWSerializer(
        data={
            **master_json,
            "last_modified": last_modified,
            "is_published": is_published,
            "course_prefix": course_prefix,
            "raw_json": master_json,  # This is slightly cleaner than popping the extra fields inside the serializer
        },
        instance=course_instance,
    )
    if not ocw_serializer.is_valid():
        log.error(
            "Course %s is not valid: %s %s",
            master_json.get("uid"),
            ocw_serializer.errors,
            master_json.get("image_src"),
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        course = ocw_serializer.save()

        # Try and get the CourseRun instance.
        try:
            courserun_instance = course.course_runs.get(
                course_run_id=master_json.get("uid")
            )
        except CourseRun.DoesNotExist:
            courserun_instance = None
        run_serializer = CourseRunSerializer(
            data={
                **master_json,
                "key": master_json.get("uid"),
                "staff": master_json.get("instructors"),
                "seats": [{"price": "0.00", "mode": "audit", "upgrade_deadline": None}],
                "content_language": master_json.get("language"),
                "short_description": master_json.get("description"),
                "level_type": master_json.get("course_level"),
                "year": master_json.get("from_year"),
                "semester": master_json.get("from_semester"),
                "offered_by": OfferedBy.ocw.value,
                "availability": AvailabilityType.current.value,
                "image": {
                    "src": master_json.get("image_src"),
                    "description": master_json.get("image_description"),
                },
                "max_modified": last_modified,
                "content_type": ContentType.objects.get(model="course").id,
                "object_id": course.id,
                "url": get_course_url(
                    master_json.get("uid"), master_json, PlatformType.ocw.value
                ),
            },
            instance=courserun_instance,
        )
        if not run_serializer.is_valid():
            log.error(
                "OCW CourseRun %s is not valid: %s",
                master_json.get("key"),
                run_serializer.errors,
            )
            return
        run_serializer.save()

    upsert_course(course)


def get_s3_object_and_read(obj, iteration=0):
    """
    Attempts to read S3 data, and tries again up to MAX_S3_GET_ITERATIONS if it encounters an error.
    This helps to prevent read timeout errors from stopping sync.

    Args:
        obj (s3.ObjectSummary): The S3 ObjectSummary we are trying to read
        iteration (int): A number tracking how many times this function has been run

    Returns:
        The string contents of a json file read from S3
    """
    try:
        return obj.get()["Body"].read()
    except Exception:  # pylint: disable=broad-except
        if iteration < settings.MAX_S3_GET_ITERATIONS:
            return get_s3_object_and_read(obj, iteration + 1)
        else:
            raise


def format_date(date_str):
    """
    Coverts date from 2016/02/02 20:28:06 US/Eastern to 2016-02-02 20:28:06-05:00

    Args:
        date_str (String): Datetime object as string in the following format (2016/02/02 20:28:06 US/Eastern)
    Returns:
        Datetime object if passed date is valid, otherwise None
    """
    if date_str and date_str != "None":
        date_pieces = date_str.split(" ")  # e.g. 2016/02/02 20:28:06 US/Eastern
        date_pieces[0] = date_pieces[0].replace("/", "-")
        # Discard milliseconds if exists
        date_pieces[1] = (
            date_pieces[1][:-4] if "." in date_pieces[1] else date_pieces[1]
        )
        tz = date_pieces.pop(2)
        timezone = pytz.timezone(tz) if "GMT" not in tz else pytz.timezone("Etc/" + tz)
        tz_stripped_date = datetime.strptime(" ".join(date_pieces), "%Y-%m-%d %H:%M:%S")
        tz_aware_date = timezone.localize(tz_stripped_date)
        tz_aware_date = tz_aware_date.astimezone(pytz.utc)
        return tz_aware_date
    return None


def generate_course_prefix_list(bucket):
    """
    Assembles a list of OCW course prefixes from an S3 Bucket that contains all the raw jsons files

    Args:
        bucket (s3.Bucket): Instantiated S3 Bucket object
    Returns:
        List of course prefixes
    """
    ocw_courses = set()
    log.info("Assembling list of courses...")
    for bucket_file in bucket.objects.all():
        key_pieces = bucket_file.key.split("/")
        course_prefix = (
            "/".join(key_pieces[0:2]) if key_pieces[0] == "PROD" else key_pieces[0]
        )
        # retrieve courses, skipping non-courses (bootcamps, department topics, etc)
        if course_prefix not in NON_COURSE_DIRECTORIES:
            if "/".join(key_pieces[:-2]) != "":
                ocw_courses.add("/".join(key_pieces[:-2]) + "/")
    return list(ocw_courses)


def get_course_availability(course):
    """
    Gets the attribute `availability` for a course if any

    Args:
        course (Course): Course model instance

    Returns:
        str: The url for the course if any
    """
    if course.platform == PlatformType.ocw.value:
        return AvailabilityType.current.value
    elif course.platform == PlatformType.mitx.value:
        course_json = course.raw_json
        if course_json is None:
            return
        course_runs = course_json.get("course_runs")
        if course_runs is None:
            return
        # get appropriate course_run
        for run in course_runs:
            if run.get("key") == course.course_id:
                return run.get("availability")


def parse_bootcamp_json_data(bootcamp_data, force_overwrite=False):
    """
    Main function to parse bootcamp json data for one bootcamp

    Args:
        bootcamp_data (dict): The JSON object representing the bootcamp
        force_overwrite (bool): A boolean value to force the incoming bootcamp data to overwrite existing data
    """
    # Get the last modified date from the bootcamp
    bootcamp_modified = bootcamp_data.get("last_modified")

    # Try and get the bootcamp instance. If it exists check to see if it needs updating
    try:
        bootcamp_instance = Bootcamp.objects.get(
            course_id=bootcamp_data.get("course_id")
        )
        compare_datetime = datetime.strptime(
            bootcamp_modified, "%Y-%m-%dT%H:%M:%S.%fZ"
        ).astimezone(pytz.utc)
        if compare_datetime <= bootcamp_instance.last_modified and not force_overwrite:
            log.debug(
                "(%s, %s) skipped",
                bootcamp_data.get("key"),
                bootcamp_data.get("course_id"),
            )
            return
        index_func = update_bootcamp
    except Bootcamp.DoesNotExist:
        bootcamp_instance = None
        index_func = index_new_bootcamp

    # Overwrite platform with our own enum value
    bootcamp_data["platform"] = PlatformType.bootcamps.value
    bootcamp_serializer = BootcampSerializer(
        data=bootcamp_data, instance=bootcamp_instance
    )
    if not bootcamp_serializer.is_valid():
        log.error(
            "Bootcamp %s is not valid: %s",
            bootcamp_data.get("course_id"),
            bootcamp_serializer.errors,
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        bootcamp = bootcamp_serializer.save()

        # Try and get the CourseRun instance.
        try:
            courserun_instance = bootcamp.course_runs.get(
                course_run_id=bootcamp.course_id
            )
        except CourseRun.DoesNotExist:
            courserun_instance = None
        run_serializer = CourseRunSerializer(
            data={
                **bootcamp_data,
                "key": bootcamp_data.get("course_id"),
                "staff": bootcamp_data.get("instructors"),
                "seats": bootcamp_data.get("prices"),
                "start": bootcamp_data.get("start_date"),
                "end": bootcamp_data.get("end_date"),
                "course_run_id": bootcamp.course_id,
                "max_modified": bootcamp_modified,
                "offered_by": OfferedBy.bootcamps.value,
                "content_type": ContentType.objects.get(model="bootcamp").id,
                "object_id": bootcamp.id,
                "url": bootcamp.url,
            },
            instance=courserun_instance,
        )
        if not run_serializer.is_valid():
            log.error(
                "Bootcamp CourseRun %s is not valid: %s",
                bootcamp_data.get("key"),
                run_serializer.errors,
            )
            return
        run_serializer.save()
    index_func(bootcamp)
