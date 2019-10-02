""" Utils for course catalog """
import re
from datetime import datetime
from urllib.parse import urljoin

import pytz
from django.conf import settings

from course_catalog.constants import ocw_edx_mapping, semester_mapping, PlatformType

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
            for run in course_json.get("runs", []):
                url = run.get("marketing_url", "")
                if url and settings.MITX_BASE_URL in url:
                    preferred_urls.append(url)
            if preferred_urls:
                return preferred_urls[0].split("?")[0]
        return "{}{}/course/".format(settings.MITX_ALT_URL, course_id)
    return None


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
    else:
        return
    return datetime.strptime("{}-{}".format(year, month_day), "%Y-%m-%d").replace(
        tzinfo=pytz.UTC
    )
