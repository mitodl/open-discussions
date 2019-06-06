"""
course_catalog helper functions for tasks
"""
import json
import logging
from datetime import datetime
from urllib.parse import urljoin

import pytz
import requests
from django.db import transaction
from django.conf import settings
from course_catalog.constants import (
    PlatformType,
    MIT_OWNER_KEYS,
    NON_COURSE_DIRECTORIES,
    AvailabilityType,
)
from course_catalog.models import Course, Bootcamp
from course_catalog.serializers import (
    CourseSerializer,
    BootcampSerializer,
    EDXSerializer,
    OCWSerializer,
)
from search.task_helpers import update_course, index_new_course

log = logging.getLogger(__name__)


def get_access_token():
    """
    Get an access token for edx
    """
    post_data = {
        "grant_type": "client_credentials",
        "client_id": settings.EDX_API_CLIENT_ID,
        "client_secret": settings.EDX_API_CLIENT_SECRET,
        "token_type": "jwt",
    }
    response = requests.post(
        "https://api.edx.org/oauth2/v1/access_token", data=post_data
    )
    return response.json()["access_token"]


def parse_mitx_json_data(course_data, force_overwrite=False):
    """
    Main function to parse edx json data for one course

    Args:
        course_data (dict): The JSON object representing the course with all its course runs
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
    """

    # Make sure this is an MIT course
    if not is_mit_course(course_data):
        return

    # Get the last modified date from the course data
    course_modified = course_data.get("modified")

    # Parse each course run individually
    for course_run in course_data.get("course_runs"):

        if should_skip_course(course_run.get("title")):
            continue

        # Get the last modified date from the course run
        course_run_modified = course_run.get("modified")

        # Since we use data from both course and course_run and they use different modified timestamps,
        # we need to find the newest changes
        max_modified = (
            course_modified
            if course_modified > course_run_modified
            else course_run_modified
        )

        # Try and get the course instance. If it exists check to see if it needs updating
        try:
            course_instance = Course.objects.get(course_id=course_run.get("key"))
            compare_datetime = datetime.strptime(
                max_modified, "%Y-%m-%dT%H:%M:%S.%fZ"
            ).astimezone(pytz.utc)
            if (
                compare_datetime <= course_instance.last_modified
                and not force_overwrite
            ):
                log.debug(
                    "(%s, %s) skipped", course_data.get("key"), course_run.get("key")
                )
                continue
            index_func = update_course
        except Course.DoesNotExist:
            course_instance = None
            index_func = index_new_course

        edx_serializer = EDXSerializer(
            data={
                **course_run,
                "course_image": course_data.get("image"),
                "max_modified": max_modified,
                "raw_json": course_data,  # This is slightly cleaner than popping the extra fields inside the serializer
            },
            instance=course_instance,
        )

        if not edx_serializer.is_valid():
            log.error(
                "Course %s is not valid: %s",
                course_run.get("key"),
                edx_serializer.errors,
            )
            continue

        # Make changes atomically so we don't end up with partially saved/deleted data
        with transaction.atomic():
            course = edx_serializer.save()
            index_func(course)


def is_mit_course(course_data):
    """
    Helper function to determine if a course is an MIT course

    Args:
        course_data (dict): The JSON object representing the course with all its course runs

    Returns:
        bool: indicates whether the course is owned by MIT
    """
    for owner in course_data.get("owners"):
        if owner["key"] in MIT_OWNER_KEYS:
            return True
    return False


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

    index_func = update_course if course_instance is not None else index_new_course
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
        index_func(course)


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


def get_course_url(course_id, course_json, platform):
    """
    Get the url for a course if any

    Args:
        course_id (str): The course_id of the course
        course_json (dict): The raw json for the course
        platform (str): The platform (mitx or ocw)

    Returns:
        str: The url for the course if any
    """
    if platform == PlatformType.ocw.value:
        if course_json is not None:
            urlpath = course_json.get("url")
            if urlpath:
                return urljoin(settings.OCW_BASE_URL, urlpath)
    elif platform == PlatformType.mitx.value:
        if course_json is not None:
            preferred_urls = [
                run["marketing_url"]
                for run in course_json.get("course_runs", [])
                if settings.MITX_BASE_URL in run.get("marketing_url", "")
            ]
            if preferred_urls:
                return preferred_urls[0].split("?")[0]
        return "{}{}/course/".format(settings.MITX_ALT_URL, course_id)
    return None


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


def should_skip_course(course_title):
    """
    Returns True if '[delete]', 'delete ' (note the ending space character)
    exists in a course's title or if the course title equals 'delete' for the
    purpose of skipping the course

    Args:
        course_title (str): The course.title of the course

    Returns:
        bool

    """
    title = course_title.strip().lower()
    if (
        "[delete]" in title
        or "(delete)" in title
        or "delete " in title
        or title == "delete"
    ):
        return True
    return False


def tag_edx_course_program():
    """
    Mark courses that are part of professional education or MicroMasters programs
    """
    micromasters_courses = {
        micro_course["edx_course_key"]: micro_course["program_title"]
        for micro_course in get_micromasters_data()
    }

    with open("course_catalog/data/professional_programs.json", "r") as json_file:
        prof_ed_json = json.load(json_file)
    prof_ed_courses = {
        prof_ed_course["edx_course_key"]: prof_ed_course["program_title"]
        for prof_ed_course in prof_ed_json
    }

    with transaction.atomic():
        courses = Course.objects.filter(platform=PlatformType.mitx.value)
        # Clear program information to handle situations where a course is removed from a program
        courses.update(program_type=None, program_name=None)
        for course in courses:
            # Check Professional Education
            if "ProfessionalX" in course.course_id or "MITxPRO" in course.course_id:
                course.program_type = "Professional"
                prof_ed_program = prof_ed_courses.get(course.course_id)
                if prof_ed_program:
                    course.program_name = prof_ed_program
                course.save()
                continue

            # Check MicroMasters
            micromasters_program = micromasters_courses.get(course.course_id)
            if micromasters_program:
                course.program_type = "MicroMasters"
                course.program_name = micromasters_program
                course.save()
                continue


def get_micromasters_data():
    """
    Get json course data from micromasters
    """
    return requests.get(settings.MICROMASTERS_COURSE_URL).json()


def parse_bootcamp_json_data_course(course_data, force_overwrite=False):
    """
    Main function to parse bootcamp json data for one course

    Args:
        course_data (dict): The JSON object representing the course with all its course runs
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
    """
    # Get the last modified date from the course run
    course_run_modified = course_data.get("last_modified")

    # Try and get the course instance. If it exists check to see if it needs updating
    try:
        course_instance = Course.objects.get(course_id=course_data.get("course_id"))
        compare_datetime = datetime.strptime(
            course_run_modified, "%Y-%m-%dT%H:%M:%S.%fZ"
        ).astimezone(pytz.utc)
        if compare_datetime <= course_instance.last_modified and not force_overwrite:
            log.debug(
                "(%s, %s) skipped", course_data.get("key"), course_data.get("course_id")
            )
            return
        index_func = update_course
    except Course.DoesNotExist:
        course_instance = None
        index_func = index_new_course

    # Overwrite platform with our own enum value
    course_data["platform"] = PlatformType.bootcamps.value

    course_serializer = CourseSerializer(data=course_data, instance=course_instance)
    if not course_serializer.is_valid():
        log.error(
            "Course %s is not valid: %s",
            course_data.get("course_id"),
            course_serializer.errors,
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        course = course_serializer.save()
        index_func(course)


def parse_bootcamp_json_data_bootcamp(bootcamp_data, force_overwrite=False):
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
        index_func = update_course
    except Bootcamp.DoesNotExist:
        bootcamp_instance = None
        index_func = index_new_course

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
        index_func(bootcamp)
