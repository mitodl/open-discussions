"""
course_catalog tasks
"""
import logging

import requests
import boto3
from ocw_data_parser import OCWParser
from celery.task import task
from django.conf import settings
from course_catalog.constants import NON_COURSE_DIRECTORIES
from course_catalog.models import Course
from course_catalog.tasks_helpers import (
    get_access_token,
    parse_mitx_json_data,
    safe_load_json,
    digest_ocw_course,
    get_s3_object_and_read,
)


log = logging.getLogger(__name__)


@task
def get_edx_data():
    """
    Task to sync mitx data with the database
    """
    url = settings.EDX_API_URL

    while url:
        access_token = get_access_token()
        response = requests.get(url, headers={"Authorization": "JWT " + access_token})
        if response.status_code == 200:
            for course_data in response.json()["results"]:
                try:
                    parse_mitx_json_data(course_data)
                except Exception:  # pylint: disable=broad-except
                    log.exception("Error encountered parsing MITx json")
        else:
            log.error("Bad response status %s for %s", str(response.status_code), url)
            break

        url = response.json()["next"]


@task
def get_ocw_data():
    """
    Task to sync OCW course data with database
    """
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_CONTENT_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_CONTENT_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)

    # Get all the courses keys
    ocw_courses = set()
    log.info("Assembling list of courses...")
    for file in raw_data_bucket.objects.all():
        key_pieces = file.key.split("/")
        course_prefix = key_pieces[0] + "/" + key_pieces[1]
        if course_prefix not in NON_COURSE_DIRECTORIES:
            if "/".join(key_pieces[:-2]) != "":
                ocw_courses.add("/".join(key_pieces[:-2]))

    # Loop over each course
    for course_prefix in ocw_courses:
        loaded_raw_jsons_for_course = []
        last_modified_dates = []
        course_id = None
        log.info("Syncing: %s ...", course_prefix)
        # Collect last modified timestamps for all course files of the course
        for obj in raw_data_bucket.objects.filter(Prefix=course_prefix):
            # the "1.json" metadata file contains a course's uid
            if obj.key == course_prefix + "/0/1.json":
                try:
                    course_id = safe_load_json(
                        get_s3_object_and_read(obj), obj.key
                    ).get("_uid")
                except Exception:  # pylint: disable=broad-except
                    log.exception(
                        "Error encountered reading 1.json for %s", course_prefix
                    )
            # accessing last_modified from s3 object summary is fast (does not download file contents)
            last_modified_dates.append(obj.last_modified)
        if not course_id:
            # skip if we're unable to fetch course's uid
            continue
        # get the latest modified timestamp of any file in the course
        last_modified = max(last_modified_dates)
        try:
            # if course synced before, update existing Course instance
            course_instance = Course.objects.get(course_id=course_id)
            # Make sure that the data we are syncing is newer than what we already have
            if last_modified <= course_instance.last_modified:
                log.info("Already synced. No changes found for %s", course_prefix)
                continue
        except Course.DoesNotExist:
            # create new Course instance
            course_instance = None
        try:
            # fetch JSON contents for each course file in memory (slow)
            for obj in raw_data_bucket.objects.filter(Prefix=course_prefix):
                loaded_raw_jsons_for_course.append(
                    safe_load_json(get_s3_object_and_read(obj), obj.key)
                )
            # pass course contents into parser
            parser = OCWParser("", "", loaded_raw_jsons_for_course)
            parser.setup_s3_uploading(
                settings.OCW_LEARNING_COURSE_BUCKET_NAME,
                settings.OCW_LEARNING_COURSE_ACCESS_KEY,
                settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
                course_prefix.split("/")[-1],
            )
            # Upload all course media to S3 before serializing course to ensure the existence of links
            parser.upload_all_media_to_s3()
            master_json = parser.master_json
            digest_ocw_course(master_json, last_modified, course_instance)
        except Exception:  # pylint: disable=broad-except
            log.exception("Error encountered parsing OCW json for %s", course_prefix)
