"""OCW course catalog ETL"""
import logging
from urllib.parse import urlparse

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
    json_course_files = course_run_json.get("course_files", [])
    json_course_pages = course_run_json.get("course_pages", [])
    json_course_files.extend(course_run_json.get("course_foreign_files", []))

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


def transform_content_file(course_run_json, content_file, content_type):
    """
    Transforms content json based on master_json

    Args:
        course_run_json (dict): course run master_json
        content_file (dict): the content_file json
        content_type (str): file or page

    Returns:
        dict: transformed content_file json
    """
    bucket = get_ocw_learning_course_bucket()
    content_json = {}
    json_course_pages = course_run_json.get("course_pages", [])

    content_file["content_type"] = content_type
    if content_type == CONTENT_TYPE_PAGE:
        key = f"{course_run_json.get('url').split('/')[-1]}/{content_file.get('uid')}.html"
        content_file["key"] = key
        partial_url = content_file.get("url", None)
        if partial_url:
            content_file["url"] = f"https://ocw.mit.edu{partial_url}"
        # modify the following after ocw_parser saves HTML pages to S3
        file_type = content_file.get("type", None)
        text = content_file.get("text", "")
        # ES attachment plugin won't parse partial html
        if text and not text.startswith("<html"):
            text = f"<html><body>{text}</body></html>"
            content_json = extract_text_metadata(text)
            sync_s3_text(bucket, key, content_json)
    else:
        s3_url = content_file.get("file_location", None)
        if not s3_url and content_type == CONTENT_TYPE_FILE:
            # Nothing to do without an S3 URL
            return content_file
        key = urlparse(s3_url).path[1:]
        content_file["key"] = key
        file_type = content_file.get("file_type", None)
        content_file["url"] = get_content_file_url(
            content_file,
            [
                media
                for sublist in extract_values(course_run_json, "embedded_media")
                for media in sublist
            ],
        )
        extension = key.split(".")[-1].lower()
        s3_obj_body = bucket.Object(key).get().get("Body", None)
        if extension in VALID_TEXT_FILE_TYPES and s3_obj_body is not None:
            content_json = extract_text_metadata(s3_obj_body)
            sync_s3_text(bucket, key, content_json)

    content_file["section"] = get_content_file_section(content_file, json_course_pages)
    content_json_meta = content_json.get("metadata", {})
    content_file["content"] = content_json.get("content", None)
    content_file["content_author"] = content_json_meta.get("Author", None)
    content_file["content_language"] = content_json_meta.get("language", None)
    content_file["content_title"] = content_json_meta.get("title", None)
    content_file["file_type"] = file_type

    for field in list(
        set(content_file.keys())
        - {field.name for field in ContentFile._meta.get_fields()}
    ):
        content_file.pop(field)

    return content_file


def get_content_file_url(content_file, media_section):
    """
    Calculate the best URL for a content file

    Args:
    content_file (dict): the content file JSON
    media_section (list of dict): list of media definitions

    Returns:
        str: url
    """
    if content_file.get("uid", None) is not None:
        # Media info, if it exists, contains external URL details for a file
        media_info = [
            media for media in media_section if media["uid"] == content_file["uid"]
        ]
        if media_info:
            return media_info[0].get(
                "technical_location", media_info[0].get("media_info", None)
            )
        else:
            # Fall back to the new S3 URL if nothing else can be found
            return f"https://s3.amazonaws.com/{settings.OCW_LEARNING_COURSE_BUCKET_NAME}/{content_file.get('key')}"
    elif content_file.get("link", None) is not None:
        return content_file.get("link", content_file.get("file_location", None))
    return None


def get_content_file_section(content_file, pages_section):
    """
    Get the section the content belongs to

    Args:
    content_file (dict): the content file JSON
    pages_section (list of dict): list of pages

    Returns:
        str: page section
    """
    if content_file.get("parent_uid") is not None:
        page_info = [
            page for page in pages_section if page["uid"] == content_file["parent_uid"]
        ]
        if page_info:
            return page_info[0]["title"]
        elif content_file.get("content_type") == CONTENT_TYPE_PAGE:
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
