"""
course_catalog tasks
"""
import logging
import json

import requests
import boto3
from django.conf import settings

from open_discussions.celery import app
from course_catalog.constants import PlatformType
from course_catalog.models import Course
from course_catalog.api import sync_ocw_data, parse_bootcamp_json_data
from course_catalog.etl import pipelines


log = logging.getLogger(__name__)


@app.task
def get_mitx_data():
    """Task to sync mitx data with the database"""
    pipelines.mitx_etl()


@app.task
def get_ocw_data(
    force_overwrite=False, upload_to_s3=True
):  # pylint:disable=too-many-locals,too-many-branches
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
    sync_ocw_data(force_overwrite=force_overwrite, upload_to_s3=upload_to_s3)


@app.task
def upload_ocw_master_json():
    """
    Task to upload all OCW Course master json data to S3
    """
    s3_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_LEARNING_COURSE_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY,
    ).Bucket(settings.OCW_LEARNING_COURSE_BUCKET_NAME)

    for course in Course.objects.filter(platform=PlatformType.ocw.value).iterator(
        chunk_size=settings.OCW_ITERATOR_CHUNK_SIZE
    ):
        # Approximate course_prefix from course.url
        course_url = course.url
        if course_url[-1] == "/":
            course_url = course_url[:-1]
        s3_folder = course_url.split("/")[-1]

        s3_bucket.put_object(
            Key=s3_folder + f"/{course.course_id}_master.json",
            Body=json.dumps(course.raw_json),
            ACL="private",
        )


@app.task
def get_bootcamp_data(force_overwrite=False):
    """
    Task to create/update courses from bootcamp.json
    """
    if not settings.BOOTCAMPS_URL:
        log.warning("Required settings missing for get_bootcamp_data")
        return

    response = requests.get(settings.BOOTCAMPS_URL)
    if response.status_code == 200:
        bootcamp_json = response.json()
        for bootcamp in bootcamp_json:
            parse_bootcamp_json_data(bootcamp, force_overwrite=force_overwrite)


@app.task(acks_late=True)
def get_micromasters_data():
    """Execute the MicroMasters ETL pipeline"""
    pipelines.micromasters_etl()


@app.task(acks_late=True)
def get_xpro_data():
    """Execute the xPro ETL pipeline"""
    pipelines.xpro_programs_etl()
    pipelines.xpro_courses_etl()


@app.task(acks_late=True)
def get_oll_data():
    """Execute the oLL ETL pipeline"""
    pipelines.oll_etl()
