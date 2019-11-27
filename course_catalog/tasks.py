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
from course_catalog.etl import pipelines, youtube

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
    """Execute the OLL ETL pipeline"""
    pipelines.oll_etl()


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
