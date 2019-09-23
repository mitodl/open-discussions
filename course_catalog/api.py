"""
course_catalog api functions
"""
import json
import logging
from datetime import datetime

import pytz
import requests

from django.db import transaction
from django.conf import settings
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import (
    PlatformType,
    MIT_OWNER_KEYS,
    NON_COURSE_DIRECTORIES,
    AvailabilityType,
    OfferedBy,
)
from course_catalog.models import Course, Bootcamp, CourseRun
from course_catalog.serializers import (
    BootcampSerializer,
    EDXCourseSerializer,
    CourseRunSerializer,
    OCWSerializer,
)
from course_catalog.utils import get_course_url
from search.task_helpers import upsert_course, index_new_bootcamp, update_bootcamp

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

    # Check if this should be skipped based on title
    if should_skip_course(course_data.get("title")):
        return

    # Make sure there are course runs
    if not course_data.get("course_runs"):
        return

    # Get the last modified date from the course data
    course_modified = datetime.strptime(
        course_data.get("modified"), "%Y-%m-%dT%H:%M:%S.%fZ"
    ).astimezone(pytz.utc)

    # Try and get the Course instance. If it exists check to see if it needs updating
    try:
        course = Course.objects.get(course_id=course_data.get("key"))
        needs_update = (course_modified >= course.last_modified) or force_overwrite
    except Course.DoesNotExist:
        course = None
        needs_update = True

    if needs_update:
        edx_serializer = EDXCourseSerializer(
            data={
                **course_data,
                "course_image": course_data.get("image"),
                "max_modified": course_modified,
                "raw_json": course_data,  # This is slightly cleaner than popping the extra fields inside the serializer
            },
            instance=course,
        )

        if not edx_serializer.is_valid():
            log.error(
                "Course %s is not valid: %s",
                course_data.get("key"),
                edx_serializer.errors,
            )
        else:
            # Make changes atomically so we don't end up with partially saved/deleted data
            with transaction.atomic():
                course = edx_serializer.save()
                # Parse each course run individually
                for course_run in course_data.get("course_runs"):
                    if should_skip_course(course_run.get("title")):
                        continue

                    # Get the last modified date from the course run
                    course_run_modified = datetime.strptime(
                        course_run.get("modified"), "%Y-%m-%dT%H:%M:%S.%fZ"
                    ).astimezone(pytz.utc)

                    # Since we use data from both course and course_run and they use different modified timestamps,
                    # we need to find the newest changes
                    max_modified = max(course_modified, course_run_modified)

                    # Try and get the CourseRun instance. If it exists check to see if it needs updating
                    try:
                        courserun_instance = course.course_runs.get(
                            course_run_id=course_run.get("key")
                        )
                        if (
                            max_modified <= courserun_instance.last_modified
                            and not force_overwrite
                        ):
                            log.debug(
                                "(%s, %s) skipped",
                                course_data.get("key"),
                                course_run.get("key"),
                            )
                            continue
                    except CourseRun.DoesNotExist:
                        courserun_instance = None

                    run_serializer = CourseRunSerializer(
                        data={
                            **course_run,
                            "max_modified": max_modified,
                            "offered_by": OfferedBy.mitx.value,
                            "content_type": ContentType.objects.get(model="course").id,
                            "object_id": course.id,
                            "url": get_course_url(
                                course_run.get("key"),
                                course.raw_json,
                                PlatformType.mitx.value,
                            ),
                        },
                        instance=courserun_instance,
                    )
                    if not run_serializer.is_valid():
                        log.error(
                            "CourseRun %s is not valid: %s",
                            course_run.get("key"),
                            run_serializer.errors,
                        )
                        continue
                    run_serializer.save()
            upsert_course(course)


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
                course.offered_by = OfferedBy.xpro.value
                course.save()
                continue

            # Check MicroMasters
            micromasters_program = micromasters_courses.get(course.course_id)
            if micromasters_program:
                course.program_type = "MicroMasters"
                course.program_name = micromasters_program
                course.offered_by = OfferedBy.micromasters.value
                course.save()
                continue


def get_micromasters_data():
    """
    Get json course data from micromasters
    """
    return requests.get(settings.MICROMASTERS_COURSE_URL).json()


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
