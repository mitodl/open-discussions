"""OCW Next Resource ETL"""
import logging
import mimetypes
from os.path import splitext
from urllib.parse import urlparse, unquote

from botocore.exceptions import ClientError
from django.conf import settings

from course_catalog.constants import (
    CONTENT_TYPE_PAGE,
    VALID_TEXT_FILE_TYPES,
    CONTENT_TYPE_VIDEO,
)
from course_catalog.etl.ocw import get_content_type
from course_catalog.etl.utils import extract_text_metadata
from course_catalog.models import ContentFile
from course_catalog.utils import get_s3_object_and_read, safe_load_json

log = logging.getLogger(__name__)


def transform_ocw_next_content_files(s3_resource, course_prefix, force_overwrite):
    """
    Transforms page and resource data from the s3 bucket into content_file data

    Args:
        s3_resource (boto3.resource): The S3 resource
        course_prefix (str):String used to query S3 bucket for course data JSONs
        force_overwrite (bool): Overwrite document text if true

    Yields:
        dict: transformed content file data

    """
    bucket = s3_resource.Bucket(name=settings.OCW_NEXT_LIVE_BUCKET)

    for obj in bucket.objects.filter(Prefix=course_prefix + "pages/"):
        if obj.key.endswith("data.json"):
            try:
                course_page_json = safe_load_json(get_s3_object_and_read(obj), obj.key)
                yield transform_page(obj.key, course_page_json)

            except:  # pylint: disable=bare-except
                log.exception(
                    "ERROR syncing course file %s for course %s", obj.key, course_prefix
                )

    for obj in bucket.objects.filter(Prefix=course_prefix + "resources/"):
        if obj.key.endswith("data.json"):
            try:
                resource_json = safe_load_json(get_s3_object_and_read(obj), obj.key)
                transformed_resource = transform_resource(
                    obj.key, resource_json, s3_resource, force_overwrite
                )
                if transformed_resource:
                    yield transformed_resource

            except:  # pylint: disable=bare-except
                log.exception(
                    "ERROR syncing course file %s for course %s", obj.key, course_prefix
                )


def transform_page(s3_key, page_data):
    """
    Transforms the data from data.json for a page into content_file data

    Args:
        s3_key (str):S3 path for the data.json file for the page
        page_data (dict): JSON data from the data.json file for the page

    Returns:
        dict: transformed content file data

    """

    s3_path = s3_key.split("data.json")[0]
    return {
        "content_type": CONTENT_TYPE_PAGE,
        "url": "../" + urlparse(s3_path).path.lstrip("/"),
        "title": page_data.get("title"),
        "content_title": page_data.get("title"),
        "content": page_data.get("content"),
        "key": s3_path,
        "published": True,
    }


def transform_resource(
    s3_key, resource_data, s3_resource, force_overwrite
):  # pylint:disable=too-many-locals,too-many-branches
    """
    Transforms the data from data.json for a resource into content_file data

    Args:
        s3_key (str):S3 path for the data.json file for the page
        resource_data (dict): JSON data from the data.json file for the page
        s3_resource (str): The S3 resource
        force_overwrite (bool): Overwrite document text if true


    Returns:
        dict: transformed content file data

    """
    s3_path = s3_key.split("data.json")[0]
    s3_path = urlparse(s3_path).path.lstrip("/")

    file_type = resource_data.get("file_type")
    if resource_data.get("resource_type") == "Video":
        content_type = CONTENT_TYPE_VIDEO
    else:
        content_type = get_content_type(file_type)

    if content_type == "video":
        file_s3_path = resource_data.get("transcript_file")
        image_src = resource_data.get("thumbnail_file")
    else:
        file_s3_path = resource_data.get("file")
        image_src = None

    if not file_s3_path:
        return

    title = resource_data.get("title")

    if title in {"3play caption file", "3play pdf file"}:
        return

    if not file_s3_path.startswith("courses"):
        file_s3_path = "courses" + file_s3_path.split("courses")[1]

    ext_lower = splitext(file_s3_path)[-1].lower()
    mime_type = mimetypes.types_map.get(file_s3_path)
    content_json = None

    if ext_lower in VALID_TEXT_FILE_TYPES:
        try:
            s3_obj = s3_resource.Object(
                settings.OCW_NEXT_AWS_STORAGE_BUCKET_NAME, unquote(file_s3_path)
            ).get()
        except ClientError:
            s3_obj = s3_resource.Object(
                settings.OCW_NEXT_LIVE_BUCKET, unquote(file_s3_path)
            ).get()

        course_file_obj = ContentFile.objects.filter(key=s3_path).first()

        needs_text_update = (
            force_overwrite
            or course_file_obj is None
            or (
                s3_obj is not None
                and s3_obj["LastModified"] >= course_file_obj.updated_on
            )
        )

        if needs_text_update:
            s3_body = s3_obj["Body"].read() if s3_obj else None
            if s3_body:
                content_json = extract_text_metadata(
                    s3_body,
                    other_headers={"Content-Type": mime_type} if mime_type else {},
                )

    resource_data = {
        "description": resource_data.get("description"),
        "file_type": file_type,
        "content_type": content_type,
        "url": "../" + urlparse(s3_path).path.lstrip("/"),
        "title": title,
        "content_title": title,
        "key": s3_path,
        "learning_resource_types": resource_data.get("learning_resource_types"),
        "published": True,
    }

    if content_json:
        resource_data["content"] = content_json.get("content")

    if image_src:
        resource_data["image_src"] = image_src

    return resource_data
