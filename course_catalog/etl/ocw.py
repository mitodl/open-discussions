"""OCW course catalog ETL"""
import copy
import logging
import mimetypes
from os.path import splitext
from urllib.parse import urlparse, urljoin

import boto3
import rapidjson
from django.conf import settings

from course_catalog.constants import (
    CONTENT_TYPE_PAGE,
    CONTENT_TYPE_FILE,
    VALID_TEXT_FILE_TYPES,
)
from course_catalog.etl.utils import extract_text_metadata, sync_s3_text
from course_catalog.models import ContentFile, get_max_length
from open_discussions.utils import extract_values

log = logging.getLogger()


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
            content_files.append(
                transform_content_file(course_run_json, course_file, CONTENT_TYPE_FILE)
            )
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
                transform_content_file(course_run_json, course_page, CONTENT_TYPE_PAGE)
            )
        except:  # pylint: disable=bare-except
            log.exception(
                "ERROR syncing course page %s for run %s",
                course_page.get("uid", ""),
                course_run_json.get("uid", ""),
            )
    return [content_file for content_file in content_files if content_file is not None]


def transform_content_file(
    course_run_json, content_file_data, content_type
):  # pylint: disable=too-many-locals
    """
    Transforms content file json based on parent course run master_json

    Args:
        course_run_json (dict): course run master_json
        content_file_data (dict): the content_file json
        content_type (str): file or page

    Returns:
        dict: transformed content_file json
    """
    content_json = {}
    content_file = copy.deepcopy(content_file_data)
    content_file["content_type"] = content_type
    content_file["file_type"] = content_file.get("file_type", content_file.get("type"))
    content_file["url"] = get_content_file_url(
        course_run_json, content_file, content_type
    )
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


def get_content_file_url(course_run_json, content_file_data, content_type):
    """
    Calculate the best URL for a content file.
    For a content page, use the url attribute.
    For a course file, try to use the run url, parent page short_url, and file_location.
    If there is no parent page, try to construct a URL from a matching uid in the "embedded_media" entities.
    Foreign files should have a "link" attribute to use.
    If all else fails, use the S3 URL.

    Args:
        course_run_json (dict): the course run info
        content_file_data (dict): content file data
        content_type (str): file or page

    Returns:
        str: url
    """
    if content_type == CONTENT_TYPE_PAGE:
        return urljoin(settings.OCW_BASE_URL, content_file_data.get("url", ""))

    # Try reverse-engineering the URL from page info
    base_url = course_run_json.get("url")
    parent_page = get_page_by_uid(
        content_file_data.get("parent_uid"), course_run_json.get("course_pages", [])
    )
    if parent_page and base_url:
        section = parent_page.get("short_url")
        suffix = (
            content_file_data.get("file_location", "")
            .split("/")[-1]
            .replace(f"{content_file_data.get('uid', '')}_", "")
        )

        if suffix:
            return urljoin(settings.OCW_BASE_URL, "/".join([base_url, section, suffix]))

    # Try the media info section next
    media_info = [
        media
        for sublist in extract_values(course_run_json, "embedded_media")
        for media in sublist
        if media.get("uid", None) == content_file_data.get("uid", "")
    ]
    if media_info:
        return media_info[0].get("technical_location", media_info[0].get("media_info"))

    # Foreign course files should have a non-S3 url
    foreign_link = content_file_data.get("link")
    if foreign_link is not None:
        return foreign_link
    # If none of the above worked, use the S3 URL as a last resort
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

    manifest = {"results": courses, "count": len(courses)}

    ocw_bucket = get_ocw_learning_course_bucket()
    ocw_bucket.put_object(Key="edx_courses.json", Body=rapidjson.dumps(manifest))
    return True
