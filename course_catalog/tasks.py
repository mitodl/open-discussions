"""
course_catalog tasks
"""
import logging

import requests
import boto3
from ocw_data_parser import OCWParser
from celery.task import task
from django.conf import settings
from course_catalog.models import Course
from course_catalog.task_helpers import (
    get_access_token,
    parse_mitx_json_data,
    safe_load_json,
    digest_ocw_course,
    get_s3_object_and_read,
    format_date,
    generate_course_prefix_list,
)


log = logging.getLogger(__name__)


@task
def get_edx_data(force_overwrite=False):
    """
    Task to sync mitx data with the database
    Args:
        force_overwrite (bool): A boolean value to force the incoming course data to overwrite existing data
    """
    if not (
        settings.EDX_API_URL
        and settings.EDX_API_CLIENT_ID
        and settings.EDX_API_CLIENT_SECRET
    ):
        log.warning("Required settings missing for get_edx_data")
        return
    url = settings.EDX_API_URL
    access_token = get_access_token()

    while url:
        response = requests.get(url, headers={"Authorization": "JWT " + access_token})
        if response.status_code == 200:
            for course_data in response.json()["results"]:
                try:
                    parse_mitx_json_data(course_data, force_overwrite)
                except:  # pylint: disable=bare-except
                    log.exception("Error encountered parsing MITx json")
        else:
            log.error("Bad response status %s for %s", str(response.status_code), url)
            break

        url = response.json()["next"]


@task
def get_ocw_data(upload_to_s3=True):  # pylint:disable=too-many-locals
    """
    Task to sync OCW course data with database
    """
    if not (
        settings.OCW_CONTENT_ACCESS_KEY
        and settings.OCW_CONTENT_SECRET_ACCESS_KEY
        and settings.OCW_CONTENT_BUCKET_NAME
        and settings.OCW_LEARNING_COURSE_BUCKET_NAME
        and settings.OCW_LEARNING_COURSE_ACCESS_KEY
        and settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY
    ):
        log.warning("Required settings missing for get_ocw_data")
        return
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_CONTENT_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_CONTENT_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)

    # get all the courses prefixes we care about
    ocw_courses = generate_course_prefix_list(raw_data_bucket)

    # loop over each course
    for course_prefix in sorted(ocw_courses):
        loaded_raw_jsons_for_course = []
        last_modified_dates = []
        course_id = None
        is_published = True
        log.info("Syncing: %s ...", course_prefix)
        # Collect last modified timestamps for all course files of the course
        for obj in raw_data_bucket.objects.filter(Prefix=course_prefix):
            # the "1.json" metadata file contains a course's uid
            if obj.key == course_prefix + "0/1.json":
                try:
                    first_json = safe_load_json(get_s3_object_and_read(obj), obj.key)
                    course_id = first_json.get("_uid")
                    last_published_to_production = format_date(
                        first_json.get("last_published_to_production", None)
                    )
                    last_unpublishing_date = format_date(
                        first_json.get("last_unpublishing_date", None)
                    )
                    if last_published_to_production is None or (
                        last_unpublishing_date
                        and (last_unpublishing_date > last_published_to_production)
                    ):
                        is_published = False
                except Exception:  # pylint: disable=broad-except
                    log.exception(
                        "Error encountered reading 1.json for %s", course_prefix
                    )
            # accessing last_modified from s3 object summary is fast (does not download file contents)
            last_modified_dates.append(obj.last_modified)
        if not course_id:
            # skip if we're unable to fetch course's uid
            log.info("Skipping %s, no course_id", course_prefix)
            continue
        # get the latest modified timestamp of any file in the course
        last_modified = max(last_modified_dates)

        # if course synced before, update existing Course instance
        course_instance = Course.objects.filter(course_id=course_id).first()
        # Make sure that the data we are syncing is newer than what we already have
        if course_instance and last_modified <= course_instance.last_modified:
            log.info("Already synced. No changes found for %s", course_prefix)
            continue
        try:
            # fetch JSON contents for each course file in memory (slow)
            for obj in sorted(
                raw_data_bucket.objects.filter(Prefix=course_prefix),
                key=lambda x: int(x.key.split("/")[-1].split(".")[0]),
            ):
                loaded_raw_jsons_for_course.append(
                    safe_load_json(get_s3_object_and_read(obj), obj.key)
                )
            # pass course contents into parser
            parser = OCWParser("", "", loaded_raw_jsons_for_course)
            if upload_to_s3 and is_published:
                # Upload all course media to S3 before serializing course to ensure the existence of links
                parser.setup_s3_uploading(
                    settings.OCW_LEARNING_COURSE_BUCKET_NAME,
                    settings.OCW_LEARNING_COURSE_ACCESS_KEY,
                    settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
                    # course_prefix now has trailing slash so [-2] below is the last
                    # actual element and [-1] is an empty string
                    course_prefix.split("/")[-2],
                )
                parser.upload_all_media_to_s3()
            digest_ocw_course(
                parser.get_master_json(),
                last_modified,
                course_instance,
                is_published,
                course_prefix,
            )
        except Exception:  # pylint: disable=broad-except
            log.exception("Error encountered parsing OCW json for %s", course_prefix)
