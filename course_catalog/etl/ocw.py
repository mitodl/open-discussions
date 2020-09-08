"""OCW course catalog ETL"""
import copy
import logging
import mimetypes
from os.path import splitext
from urllib.parse import urlparse

import boto3
import rapidjson
from django.conf import settings

from course_catalog.constants import (
    CONTENT_TYPE_PAGE,
    CONTENT_TYPE_FILE,
    VALID_TEXT_FILE_TYPES,
    CONTENT_TYPE_VIDEO,
    CONTENT_TYPE_PDF,
)
from course_catalog.etl.utils import extract_text_metadata, sync_s3_text
from course_catalog.models import ContentFile, get_max_length

log = logging.getLogger()

OCW_DEPARTMENT_CODE_TO_NAME = {
    "1": "Civil and Environmental Engineering",
    "2": "Mechanical Engineering",
    "3": "Materials Science and Engineering",
    "4": "Architecture",
    "5": "Chemistry",
    "6": "Electrical Engineering and Computer Science",
    "7": "Biology",
    "8": "Physics",
    "9": "Brain and Cognitive Sciences",
    "10": "Chemical Engineering",
    "11": "Urban Studies and Planning",
    "12": "Earth, Atmospheric, and Planetary Sciences",
    "14": "Economics",
    "15": "Sloan School of Management",
    "16": "Aeronautics and Astronautics",
    "17": "Political Science",
    "18": "Mathematics",
    "20": "Biological Engineering",
    "21A": "Anthropology",
    "21G": "Global Studies and Languages",
    "21H": "History",
    "21L": "Literature",
    "21M": "Music and Theater Arts",
    "22": "Nuclear Science and Engineering",
    "24": "Linguistics and Philosophy",
    "CC": "Concourse",
    "CMS-W": "Comparative Media Studies/Writing",
    "EC": "Edgerton Center",
    "ES": "Experimental Study Group",
    "ESD": "Engineering Systems Division",
    "HST": "Health Sciences and Technology",
    "IDS": "Institute for Data, Systems, and Society",
    "MAS": "Media Arts and Sciences",
    "PE": "Athletics, Physical Education and Recreation",
    "RES": "Supplemental Resources",
    "STS": "Science, Technology, and Society",
    "WGS": "Women's and Gender Studies",
}


def get_ocw_learning_course_bucket():
    """
    Get the OCW S3 Bucket or None

    Returns:
        boto3.Bucket: the OCW S3 Bucket or None
    """
    s3 = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    return s3.Bucket(name=settings.OCW_LEARNING_COURSE_BUCKET_NAME)


def transform_content_files(course_run_json):
    """
    Transforms relevant sections of course_run master_json into course content_file data

    Args:
        course_run_json (dict): The course run master JSON

    Returns:
        list of dict: List of transformed content file data

    """
    json_course_files = course_run_json.get("course_files", []) + course_run_json.get(
        "course_foreign_files", []
    )
    json_course_pages = course_run_json.get("course_pages", [])

    content_files = []
    for course_file in json_course_files:
        try:
            content_files.append(transform_content_file(course_run_json, course_file))
        except:  # pylint: disable=bare-except
            log.exception(
                "ERROR syncing course file %s for run %s",
                course_file.get("uid", ""),
                course_run_json.get("uid", ""),
            )
    for course_page in json_course_pages:
        # ocw-data_parser only uploads pages with text
        if course_page.get("text", None) is None:
            continue
        try:
            content_files.append(
                transform_content_file(course_run_json, course_page, is_page=True)
            )
        except:  # pylint: disable=bare-except
            log.exception(
                "ERROR syncing course page %s for run %s",
                course_page.get("uid", ""),
                course_run_json.get("uid", ""),
            )
    return [content_file for content_file in content_files if content_file is not None]


def transform_content_file(
    course_run_json, content_file_data, is_page=False
):  # pylint: disable=too-many-locals
    """
    Transforms content file json based on parent course run master_json

    Args:
        course_run_json (dict): course run master_json
        content_file_data (dict): the content_file json
        is_page (bool): True if page else False

    Returns:
        dict: transformed content_file json
    """
    content_json = {}
    content_file = copy.deepcopy(content_file_data)
    content_file["file_type"] = content_file.get("file_type", content_file.get("type"))
    content_file["content_type"] = (
        CONTENT_TYPE_PAGE if is_page else get_content_type(content_file["file_type"])
    )
    content_file["url"] = get_content_file_url(content_file, is_page=is_page)
    content_file["section"] = get_content_file_section(
        content_file, course_run_json.get("course_pages", [])
    )

    s3_url = content_file.get("file_location", "")
    key = urlparse(s3_url).path.lstrip("/")
    content_file["key"] = key
    ext_lower = splitext(key)[-1].lower()
    mime_type = mimetypes.types_map.get(ext_lower)
    if ext_lower in VALID_TEXT_FILE_TYPES:
        try:
            bucket = get_ocw_learning_course_bucket()
            s3_obj = bucket.Object(key).get()
            course_file_obj = ContentFile.objects.filter(key=key).first()

            needs_text_update = course_file_obj is None or (
                s3_obj is not None
                and s3_obj["LastModified"] >= course_file_obj.updated_on
            )

            if needs_text_update:
                s3_body = s3_obj.get("Body") if s3_obj else None
                if s3_body:
                    content_json = extract_text_metadata(
                        s3_body,
                        other_headers={"Content-Type": mime_type} if mime_type else {},
                    )
                    sync_s3_text(bucket, key, content_json)

            if content_json:
                content_json_meta = content_json.get("metadata", {})
                content_file["content"] = content_json.get("content")
                # Sometimes Tika returns very large values (probably a mistake in pdf data), so truncate in case.
                content_file["content_author"] = content_json_meta.get("Author", "")[
                    : get_max_length("content_author")
                ]
                content_file["content_language"] = content_json_meta.get(
                    "language", ""
                )[: get_max_length("content_language")]
                content_file["content_title"] = content_json_meta.get("title", "")[
                    : get_max_length("content_title")
                ]
        except bucket.meta.client.exceptions.NoSuchKey:
            log.warning(
                "No S3 object found for %s in course run %s",
                key,
                course_run_json.get("uid"),
            )
        except:  # pylint:disable=bare-except
            log.exception(
                "Error extracting text from key %s for course run %s",
                key,
                course_run_json.get("uid"),
            )
    # Get rid of other fields
    for field in list(
        set(content_file.keys())
        - {field.name for field in ContentFile._meta.get_fields()}
    ):
        content_file.pop(field)
    content_file.pop("id", None)

    return content_file


def get_content_file_url(content_file_data, is_page=False):
    """
    Calculate the best URL for a content file.
    Otherwise, use the S3 URL - this should be converted to the appropriate CDN url if needed on the front end.

    Args:
        content_file_data (dict): content file data
        is_page (bool): True for a page, false for a file

    Returns:
        str: url
    """
    if is_page:
        return content_file_data.get("url", "")

    # Foreign course files should have a non-S3 url
    foreign_link = content_file_data.get("link")
    if foreign_link is not None:
        return foreign_link

    return content_file_data.get("file_location")


def get_page_by_uid(uid, pages):
    """
    Get a page by its UID

    Args:
        uid (str): The page UID to search for
        pages (list of dict): list of pages

    Returns:
         dict: The matching page if any
    """
    page_info = [page for page in pages if page["uid"] == uid]
    if page_info:
        return page_info[0]


def get_content_file_section(content_file, pages_section):
    """
    Get the section the content belongs to if any.
    Currently this means the title of the parent/current page if it is a 'section' page.
    This is based on a best guess from designs and may need future tweaking.

    Args:
        content_file (dict): the content file JSON
        pages_section (list of dict): list of pages

    Returns:
        str: page section
    """
    section = "Section"
    uid = content_file.get("parent_uid")
    if uid is not None:
        page = get_page_by_uid(uid, pages_section)
        if page and section in page.get("type", ""):
            return page["title"]
    if section in content_file.get("type", ""):
        return content_file.get("title")
    return None


def upload_mitx_course_manifest(courses):
    """
    Uploads the course information from MITx to the OCW bucket as a JSON manifest file

    Args:
        courses (list of dict): the list of course data as they came from MITx

    Returns:
        bool: success of upload
    """
    if not all(
        [
            settings.AWS_ACCESS_KEY_ID,
            settings.AWS_SECRET_ACCESS_KEY,
            settings.OCW_LEARNING_COURSE_BUCKET_NAME,
        ]
    ):
        log.info("OCW S3 environment variable not set, skipping upload to OCW bucket")
        return False

    if not courses:
        log.info("No edX courses, skipping upload to OCW bucket")
        return False

    log.info("Uploading edX courses data to S3")

    try:
        manifest = {"results": courses, "count": len(courses)}

        ocw_bucket = get_ocw_learning_course_bucket()
        ocw_bucket.put_object(Key="edx_courses.json", Body=rapidjson.dumps(manifest))
        return True
    except:  # pylint: disable=bare-except
        log.exception("Error uploading OCW manifest")
        return False


def get_content_type(file_type):
    """
    Return the appropriate content type for a file type
    TODO: add more content types (text? spreadsheet?)

    Args:
        file_type (str): The file type

    Returns:
        str: The content type
    """
    if not file_type:
        return CONTENT_TYPE_FILE
    if file_type.startswith("video/"):
        return CONTENT_TYPE_VIDEO
    if file_type == "application/pdf":
        return CONTENT_TYPE_PDF
    return CONTENT_TYPE_FILE
