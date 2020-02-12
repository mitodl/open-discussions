"""OCW course catalog ETL"""
import copy
import logging
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
from course_catalog.models import ContentFile
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
        aws_access_key_id=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
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
                "ERROR syncing course file %s for run %d",
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
                "ERROR syncing course page %s for run %d",
                course_page.get("uid", ""),
                course_run_json.get("uid", ""),
            )
    return content_files


def transform_content_file(
    course_run_json, content_file_data, content_type
):  # pylint: disable=too-many-locals
    """
    Transforms content json based on master_json

    Args:
        course_run_json (dict): course run master_json
        content_file_data (dict): the content_file json
        content_type (str): file or page

    Returns:
        dict: transformed content_file json
    """
    content_file = copy.deepcopy(content_file_data)
    try:
        bucket = get_ocw_learning_course_bucket()
        content_json = {}

        content_file["content_type"] = content_type
        s3_url = content_file.get("file_location", None)
        if not s3_url:
            # Nothing to do without an S3 key
            # HTML files will be skipped until latest ocw-data-parser is used
            return None

        key = urlparse(s3_url).path[1:]
        extension = key.split(".")[-1].lower()
        content_file["key"] = key
        content_file["file_type"] = content_file.get(
            "file_type", content_file.get("type", None)
        )
        content_file["url"] = get_content_file_url(
            course_run_json, content_file, content_type
        )

        s3_obj = bucket.Object(key).get()
        course_file_obj = ContentFile.objects.filter(key=key).first()
        needs_text_update = course_file_obj is None or (
            s3_obj is not None and s3_obj["LastModified"] >= course_file_obj.updated_on
        )
        if needs_text_update and extension in VALID_TEXT_FILE_TYPES:
            s3_body = s3_obj.get("Body") if s3_obj else None
            if s3_body:
                content_json = extract_text_metadata(s3_body)
                sync_s3_text(bucket, key, content_json)

        content_file["section"] = get_content_file_section(
            content_file, course_run_json.get("course_pages", [])
        )
        if content_json:
            content_json_meta = content_json.get("metadata", {})
            content_file["content"] = content_json.get("content", None)
            # Sometimes Tika returns very large values (probably a mistake in pdf data), so truncate in case.
            content_file["content_author"] = content_json_meta.get("Author", "")[
                : _get_max_length("content_author")
            ]
            content_file["content_language"] = content_json_meta.get("language", "")[
                : _get_max_length("content_language")
            ]
            content_file["content_title"] = content_json_meta.get("title", "")[
                : _get_max_length("content_title")
            ]

        # Get rid of other fields
        for field in list(
            set(content_file.keys())
            - {field.name for field in ContentFile._meta.get_fields()}
        ):
            content_file.pop(field)
        content_file.pop("id", None)

        return content_file
    except:  # pylint:disable=bare-except
        log.exception(
            "Error transforming %s for course run %s",
            rapidjson.dumps(content_file),
            course_run_json.get("uid", None),
        )


def get_content_file_url(course_run_json, content_file_data, content_type):
    """
    Calculate the best URL for a content file

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
    base_url = course_run_json.get("url", None)
    parent_page = get_page_by_uid(
        content_file_data.get("parent_uid", None),
        course_run_json.get("course_pages", []),
    )
    if parent_page and base_url:
        section = parent_page.get("short_url", None)
        suffix = (
            content_file_data.get("file_location", "")
            .split("/")[-1]
            .replace(f"{content_file_data.get('uid', '')}_", "")
        )

        if base_url and suffix:
            return urljoin(settings.OCW_BASE_URL, "/".join([base_url, section, suffix]))

    # Try the media info section next
    media_info = [
        media
        for sublist in extract_values(course_run_json, "embedded_media")
        for media in sublist
        if media.get("uid", None) == content_file_data.get("uid", "")
    ]
    if media_info:
        return media_info[0].get(
            "technical_location", media_info[0].get("media_info", None)
        )

    # Foreign course files should have a non-S3 url
    foreign_link = content_file_data.get(
        "link", content_file_data.get("file_location", None)
    )
    if foreign_link is not None:
        return foreign_link
    # If none of the above worked, use an S3 URL generated from the key
    return f"https://s3.amazonaws.com/{settings.OCW_LEARNING_COURSE_BUCKET_NAME}/{content_file_data.get('key')}"


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
    Get the section the content belongs to if any.  This may need some future tweaking.

    Args:
    content_file (dict): the content file JSON
    pages_section (list of dict): list of pages

    Returns:
        str: page section
    """
    section = "Section"
    uid = content_file.get("parent_uid", None)
    if uid is not None:
        page = get_page_by_uid(uid, pages_section)
        if page and section in page.get("type", ""):
            return page["title"]
    if content_file.get(
        "content_type"
    ) == CONTENT_TYPE_PAGE and section in content_file.get("type", ""):
        return content_file.get("title", None)
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
            settings.OCW_LEARNING_COURSE_ACCESS_KEY,
            settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
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


def _get_max_length(field):
    """
    Get the max length of a ContentFile field

    Args:
        field (str): the name of the field

    Returns:
        int: the max_length of the field
    """
    return ContentFile._meta.get_field(field).max_length
