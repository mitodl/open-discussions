"""
course_catalog helper functions for tasks
"""
import json
import logging
import re
from datetime import datetime
import pytz
import requests
from django.db import transaction
from django.conf import settings
from course_catalog.constants import (
    PlatformType,
    semester_mapping,
    MIT_OWNER_KEYS,
    ocw_edx_mapping,
    NON_COURSE_DIRECTORIES,
    ResourceType,
)
from course_catalog.models import Course, CourseTopic, CourseInstructor, CoursePrice
from course_catalog.serializers import CourseSerializer


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
        course_run_key = course_run.get("key")

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
                log.debug("(%s, %s) skipped", course_data.get("key"), course_run_key)
                continue
        except Course.DoesNotExist:
            course_instance = None

        year, semester = get_year_and_semester(course_run)

        course_fields = {
            "course_id": course_run_key,
            "title": course_run.get("title"),
            "short_description": course_run.get("short_description"),
            "full_description": course_run.get("full_description"),
            "level": course_run.get("level_type"),
            "semester": semester,
            "language": course_run.get("content_language"),
            "platform": PlatformType.mitx.value,
            "year": year,
            "start_date": course_run.get("start"),
            "end_date": course_run.get("end"),
            "enrollment_start": course_run.get("enrollment_start"),
            "enrollment_end": course_run.get("enrollment_end"),
            "image_src": (
                (course_run.get("image") or {}).get("src")
                or (course_data.get("image") or {}).get("src")
            ),
            "image_description": (
                (course_run.get("image") or {}).get("description")
                or (course_data.get("image") or {}).get("description")
            ),
            "last_modified": max_modified,
            "raw_json": course_data,
        }

        course_serializer = CourseSerializer(
            data=course_fields, instance=course_instance
        )
        if not course_serializer.is_valid():
            log.error(
                "Course %s is not valid: %s", course_run_key, course_serializer.errors
            )
            continue

        # Make changes atomically so we don't end up with partially saved/deleted data
        with transaction.atomic():
            course = course_serializer.save()
            handle_many_to_many_fields(course, course_data, course_run)


def handle_many_to_many_fields(course, course_data, course_run):
    """
    Helper function to create or link the many to many fields

    Args:
        course (Course): Course instance
        course_data (dict): The JSON object representing the course with all its course runs
        course_run (dict): The JSON object representing the particular course run
    """
    # Clear out topics and re-add them
    course.topics.clear()
    for topic in course_data.get("subjects"):
        course_topic, _ = CourseTopic.objects.get_or_create(name=topic.get("name"))
        course.topics.add(course_topic)

    # Clear out the instructors and re-add them
    course.instructors.clear()
    # In the samples it looks like instructors is never populated and staff is
    for instructor in course_run.get("staff"):
        course_instructor, _ = CourseInstructor.objects.get_or_create(
            first_name=instructor.get("given_name"),
            last_name=instructor.get("family_name"),
        )
        course.instructors.add(course_instructor)

    # Clear out the prices and re-add them
    course.prices.clear()
    for price in course_run.get("seats"):
        course_price, _ = CoursePrice.objects.get_or_create(
            price=price.get("price"),
            mode=price.get("type"),
            upgrade_deadline=price.get("upgrade_deadline"),
        )
        course.prices.add(course_price)


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


def get_year_and_semester(course_run):
    """
    Parse year and semester out of course run key. If course run key cannot be parsed attempt to get year from start.

    Args:
        course_run (dict): The JSON object representing the particular course run
        course_run_key (string): course run identifier

    Returns:
        tuple (string, string): year, semester

    """
    match = re.search(
        "[1|2|3]T[0-9]{4}", course_run.get("key")
    )  # e.g. "3T2019" -> Semester "3", Year "2019"
    if match:
        year = int(match.group(0)[-4:])
        semester = semester_mapping.get(match.group(0)[-6:-4])
    else:
        semester = None
        if course_run.get("start"):
            year = course_run.get("start")[:4]
        else:
            year = None
    return year, semester


def safe_load_json(json_string, json_file_key):
    """
    Loads the passed string as a JSON object with exception handing and logging.
    Some OCW JSON content may be malformed.

    Args:
        json_string (string): The JSON contents as a string
        json_file_key: file ID for the JSON file

    Returns:
        JSON (dict): the JSON contents as JSON
    """
    try:
        loaded_json = json.loads(json_string)
        return loaded_json
    except json.JSONDecodeError:
        log.exception("%s has a corrupted JSON", json_file_key)
        return {}


# pylint: disable=too-many-locals
def digest_ocw_course(
    master_json, last_modified, course_instance, is_published, course_prefix=""
):
    """
    Takes in OCW course master json to store it in DB

    Args:
        master_json (dict): course master JSON object as an output from ocw-data-parser
        last_modified (datetime): timestamp of latest modification of all course files
        course_instance (Course): Course instance if exists, otherwise None
        is_published (Bool): Flags OCW course as published or not
        course_prefix (String): (Optional) String used to query S3 bucket for course raw JSONs
    """
    course_fields = {
        "course_id": master_json.get("uid"),
        "title": master_json.get("title"),
        "short_description": master_json.get("description"),
        "level": master_json.get("course_level"),
        "semester": master_json.get("from_semester"),
        "language": master_json.get("language"),
        "platform": PlatformType.ocw.value,
        "year": master_json.get("from_year"),
        "image_src": master_json.get("image_src"),
        "image_description": master_json.get("image_description"),
        "last_modified": last_modified,
        "published": is_published,
        "raw_json": master_json,
    }
    if "PROD/RES" in course_prefix:
        course_fields["learning_resource_type"] = ResourceType.ocw_resource.value

    course_serializer = CourseSerializer(data=course_fields, instance=course_instance)
    if not course_serializer.is_valid():
        log.error(
            "Course %s is not valid: %s %s",
            master_json.get("uid"),
            course_serializer.errors,
            master_json.get("image_src"),
        )
        return

    # Make changes atomically so we don't end up with partially saved/deleted data
    with transaction.atomic():
        course = course_serializer.save()

        # Clear previous topics, instructors, and prices
        course.topics.clear()
        course.instructors.clear()
        course.prices.clear()

        # Handle topics
        for topic_obj in master_json.get("course_collections"):
            topics = get_ocw_topic(topic_obj)
            for topic in topics:
                course_topic, _ = CourseTopic.objects.get_or_create(name=topic)
                course.topics.add(course_topic)

        # Handle instructors
        for instructor in master_json.get("instructors"):
            course_instructor, _ = CourseInstructor.objects.get_or_create(
                first_name=instructor.get("first_name"),
                last_name=instructor.get("last_name"),
            )
            course.instructors.add(course_instructor)

        # Handle price
        course_price, _ = CoursePrice.objects.get_or_create(
            price="0.00", mode="audit", upgrade_deadline=None
        )
        course.prices.add(course_price)


def get_ocw_topic(topic_object):
    """
    Maps OCW features to edx subjects. Tries to map first by speciality, and if that fails then subfeature,
    and if that fails then feature.

    Args:
        topic_object (dict): The JSON object representing the topic

    Returns:
        list of str: list of topics
    """

    # Get topic list by specialty first, subfeature second, and feature last
    topics = (
        ocw_edx_mapping.get(topic_object.get("ocw_speciality"))
        or ocw_edx_mapping.get(topic_object.get("ocw_subfeature"))
        or ocw_edx_mapping.get(topic_object.get("ocw_feature"))
        or []
    )

    return topics


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
