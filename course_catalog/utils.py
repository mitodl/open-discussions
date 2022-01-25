""" Utils for course catalog """
import re
from datetime import datetime
from urllib.parse import urljoin

import pytz
import requests
import yaml
from django.conf import settings

from course_catalog.constants import semester_mapping, PlatformType

from open_discussions.utils import generate_filepath


def user_list_image_upload_uri(instance, filename):
    """
    upload_to handler for user-created UserList image
    """
    return generate_filepath(
        filename, instance.author.username, instance.title, "user_list"
    )


# NOTE: this is unused, but a migration references it, so we'll leave it until we decide to squash migrations or something
def program_image_upload_uri(instance, filename):
    """
    upload_to handler for Program image
    """
    return generate_filepath(filename, instance.title, "", "program")


def get_ocw_topics(topics_collection):
    """
    Extracts OCW topics and subtopics and returns a unique list of them

    Args:
        topics_collection (dict): The JSON object representing the topic

    Returns:
        list of str: list of topics
    """
    topics = []

    for topic_object in topics_collection:
        if topic_object["ocw_feature"]:
            topics.append(topic_object["ocw_feature"])
        if topic_object["ocw_subfeature"]:
            topics.append(topic_object["ocw_subfeature"])
        if topic_object["ocw_speciality"]:
            topics.append(topic_object["ocw_speciality"])

    return list(set(topics))


def get_year_and_semester(course_run):
    """
    Parse year and semester out of course run key. If course run key cannot be parsed attempt to get year from start.

    Args:
        course_run (dict): The JSON object representing the particular course run

    Returns:
        tuple (str, str): year, semester

    """
    year = course_run.get("year")
    semester = course_run.get("semester")

    if year == "":
        year = None

    if semester == "":
        semester = None

    if not semester and not year:
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
            preferred_urls = []
            for run in course_json.get("course_runs", []):
                url = run.get("marketing_url", "")
                if url and settings.MITX_BASE_URL in url:
                    preferred_urls.append(url)
            if preferred_urls:
                return preferred_urls[0].split("?")[0]
        return "{}{}/course/".format(settings.MITX_ALT_URL, course_id)
    return None


def get_ocw_department_list(course_json):
    """
    Get list of OCW department numbers
    Args:
        course_json (dict): The raw json for the course
    Returns:
        List of string department identifiers

    """
    departments = [course_json.get("department_number")]

    for extra_course_number_json in course_json.get("extra_course_number") or []:
        if extra_course_number_json:
            department_number = extra_course_number_json.get(
                "linked_course_number_col"
            ).split(".")[0]
            if department_number not in departments:
                departments.append(department_number)

    return departments


def semester_year_to_date(semester, year, ending=False):
    """
    Convert semester and year to a rough date

    Args:
        semester (str): Semester ("Fall", "Spring", etc)
        year (int): Year
        ending (boolean): True for end of semester, False for beginning

    Returns:
        datetime: The rough date of the course
    """
    if semester is None or year is None:
        return
    if semester.lower() == "fall":
        month_day = "12-31" if ending else "09-01"
    elif semester.lower() == "summer":
        month_day = "08-30" if ending else "06-01"
    elif semester.lower() == "spring":
        month_day = "05-31" if ending else "01-01"
    elif semester.lower() == "january iap":
        month_day = "01-31" if ending else "01-01"
    else:
        return
    return datetime.strptime("{}-{}".format(year, month_day), "%Y-%m-%d").replace(
        tzinfo=pytz.UTC
    )


def get_list_items_by_resource(user, object_type, object_id):
    """
    Get serialized list items for a particular user and resource

    Args:
        user (User): the User to filter list items by
        object_type (string): The object type of the resource
        object_id (int): the id of the resource

    Returns:
        list of dicts: serialized UserListItem data
    """
    from course_catalog.models import UserListItem
    from course_catalog.serializers import MicroUserListItemSerializer

    return [
        MicroUserListItemSerializer(item).data
        for item in UserListItem.objects.filter(user_list__author=user)
        .select_related("content_type")
        .filter(content_type__model=object_type)
        .filter(object_id=object_id)
    ]


def load_course_blocklist():
    """
    Get a list of blocklisted course ids

    Returns:
        list of str: list of course ids

    """
    blocklist_url = settings.BLOCKLISTED_COURSES_URL
    if blocklist_url is not None:
        response = requests.get(blocklist_url)
        response.raise_for_status()
        return [str(line, "utf-8") for line in response.iter_lines()]
    return []


def load_course_duplicates(platform):
    """
    Get a list of blocklisted course ids for a platform
    Args:
        platform (string): the platform for which course duplicates are needed
    Returns:
        list of lists of courses which are duplicates of each other
    """
    duplicates_url = settings.DUPLICATE_COURSES_URL
    if duplicates_url is not None:
        response = requests.get(duplicates_url)
        response.raise_for_status()
        duplicates_for_all_platforms = yaml.safe_load(response.text)
        if platform in duplicates_for_all_platforms:
            return duplicates_for_all_platforms[platform]
    return []
