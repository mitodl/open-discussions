"""
course_catalog tasks
"""
import logging

import celery
import rapidjson
import requests
import boto3
from django.conf import settings

from course_catalog.utils import load_course_blacklist
from course_catalog.constants import PlatformType
from course_catalog.models import Course
from course_catalog.api import (
    generate_course_prefix_list,
    parse_bootcamp_json_data,
    sync_ocw_courses,
    sync_ocw_course_files,
    sync_xpro_course_files,
)
from course_catalog.etl import pipelines, youtube
from open_discussions import features
from open_discussions.celery import app
from open_discussions.utils import chunks

log = logging.getLogger(__name__)


@app.task
def get_mitx_data():
    """Task to sync mitx data with the database"""
    pipelines.mitx_etl()


@app.task
def get_ocw_courses(*, course_prefixes, blacklist, force_overwrite, upload_to_s3):
    """Task to sync a batch of OCW courses"""
    sync_ocw_courses(
        course_prefixes=course_prefixes,
        blacklist=blacklist,
        force_overwrite=force_overwrite,
        upload_to_s3=upload_to_s3,
    )


@app.task(bind=True)
def get_ocw_data(
    self, force_overwrite=False, upload_to_s3=True, ignore_flag=False
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

    if features.is_enabled(features.WEBHOOK_OCW) and not ignore_flag:
        return

    # get all the courses prefixes we care about
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.OCW_CONTENT_ACCESS_KEY,
        aws_secret_access_key=settings.OCW_CONTENT_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)
    ocw_courses = generate_course_prefix_list(raw_data_bucket)

    # get a list of blacklisted course ids
    blacklist = load_course_blacklist()

    ocw_tasks = celery.group(
        [
            get_ocw_courses.si(
                course_prefixes=prefixes,
                blacklist=blacklist,
                force_overwrite=force_overwrite,
                upload_to_s3=upload_to_s3,
            )
            for prefixes in chunks(
                ocw_courses, chunk_size=settings.OCW_ITERATOR_CHUNK_SIZE
            )
        ]
    )
    raise self.replace(ocw_tasks)


@app.task
def get_ocw_files(ids=None):
    """
    Task to sync OCW content files with database
    """
    if not (
        settings.OCW_LEARNING_COURSE_BUCKET_NAME
        and settings.OCW_LEARNING_COURSE_ACCESS_KEY
        and settings.OCW_LEARNING_COURSE_SECRET_ACCESS_KEY
    ):
        log.warning("Required settings missing for get_ocw_files")
        return
    sync_ocw_course_files(ids)


@app.task(bind=True)
def import_all_ocw_files(self, chunk_size):
    """Import all OCW content files"""
    blacklisted_ids = load_course_blacklist()
    tasks = celery.group(
        [
            get_ocw_files.si(ids)
            for ids in chunks(
                Course.objects.filter(published=True)
                .filter(platform=PlatformType.ocw.value)
                .exclude(course_id__in=blacklisted_ids)
                .order_by("id")
                .values_list("id", flat=True),
                chunk_size=chunk_size,
            )
        ]
    )
    raise self.replace(tasks)


@app.task
def get_xpro_files(ids):
    """
    Task to sync xPRO OLX course files with database
    """
    if not (
        settings.XPRO_LEARNING_COURSE_BUCKET_NAME
        and settings.XPRO_LEARNING_COURSE_ACCESS_KEY
        and settings.XPRO_LEARNING_COURSE_SECRET_ACCESS_KEY
    ):
        log.warning("Required settings missing for get_xpro_files")
        return
    sync_xpro_course_files(ids)


@app.task(bind=True)
def import_all_xpro_files(self, chunk_size=None):
    """Ingest xPRO OLX files from the S3 bucket"""
    if chunk_size is None:
        chunk_size = settings.XPRO_ITERATOR_CHUNK_SIZE

    blacklisted_ids = load_course_blacklist()
    tasks = celery.group(
        [
            get_xpro_files.si(ids)
            for ids in chunks(
                Course.objects.filter(published=True)
                .filter(platform=PlatformType.xpro.value)
                .exclude(course_id__in=blacklisted_ids)
                .order_by("id")
                .values_list("id", flat=True),
                chunk_size=chunk_size,
            )
        ]
    )

    # to reduce the risk of triggering these multiple times, we trigger and replace this task all at once
    raise self.replace(tasks)


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
            Body=rapidjson.dumps(course.raw_json),
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
    """Execute the OLL ETL pipeline"""
    pipelines.oll_etl()


@app.task(acks_late=True)
def get_see_data():
    """Execute the SEE ETL pipeline"""
    pipelines.see_etl()


@app.task(acks_late=True)
def get_mitpe_data():
    """Execute the MITPE ETL pipeline"""
    pipelines.mitpe_etl()


@app.task(acks_late=True)
def get_csail_data():
    """Execute the CSAIL ETL pipeline"""
    pipelines.csail_etl()


@app.task(acks_late=True)
def get_youtube_data(*, channel_ids=None):
    """
    Execute the YouTube ETL pipeline

    Args:
        channel_ids (list of str or None):
            if a list the extraction is limited to those channels

    Returns:
        int:
            The number of results that were fetched
    """
    results = pipelines.youtube_etl(channel_ids=channel_ids)

    return len(list(results))


@app.task
def get_youtube_transcripts(
    *, created_after=None, created_minutes=None, overwrite=False
):
    """
    Fetch transcripts for Youtube videos

    Args:
        created_after (date or None):
            if a string transcripts are pulled only for videos added to the course catalog after that date
        created_minutes (int or None):
            if a string transcripts are pulled only from videos added created_minutes ago and after
        overwrite (bool):
            if true youtube transcriptsipts are updated for videos that already have transcripts
    """

    videos = youtube.get_youtube_videos_for_transcripts_job(
        created_after=created_after,
        created_minutes=created_minutes,
        overwrite=overwrite,
    )

    log.info("Updating transcripts for %i videos", videos.count())
    youtube.get_youtube_transcripts(videos)


@app.task(acks_late=True)
def get_video_topics(*, video_ids=None):
    """
    Execute the video topics pipeline

    Args:
        video_ids (list of int):
            list of video ids to generate topics for
    """
    pipelines.video_topics_etl(video_ids=video_ids)
