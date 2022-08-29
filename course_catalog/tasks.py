"""
course_catalog tasks
"""
import logging
from datetime import datetime

import boto3
import celery
import pytz
import rapidjson
import requests
from django.conf import settings
from django.contrib.auth.models import User

from course_catalog.api import (
    generate_course_prefix_list,
    parse_bootcamp_json_data,
    sync_ocw_course_files,
    sync_ocw_courses,
    sync_ocw_next_courses,
)
from course_catalog.constants import PlatformType
from course_catalog.etl import enrollments, pipelines, youtube
from course_catalog.etl.mitxonline import sync_mitxonline_course_files
from course_catalog.etl.xpro import sync_xpro_course_files
from course_catalog.models import Course
from course_catalog.utils import load_course_blocklist
from open_discussions.celery import app
from open_discussions.constants import ISOFORMAT
from open_discussions.utils import chunks

log = logging.getLogger(__name__)


@app.task
def get_mitx_data():
    """Task to sync mitx data with the database"""
    pipelines.mitx_etl()


@app.task(acks_late=True)
def get_ocw_courses(
    *,
    course_prefixes,
    blocklist,
    force_overwrite,
    upload_to_s3,
    utc_start_timestamp=None,
    force_s3_upload=False,
):
    """
    Task to sync a batch of OCW courses
    """

    if utc_start_timestamp:
        utc_start_timestamp = datetime.strptime(utc_start_timestamp, ISOFORMAT)
        utc_start_timestamp = utc_start_timestamp.replace(tzinfo=pytz.UTC)

    sync_ocw_courses(
        course_prefixes=course_prefixes,
        blocklist=blocklist,
        force_overwrite=force_overwrite,
        upload_to_s3=upload_to_s3,
        start_timestamp=utc_start_timestamp,
        force_s3_upload=force_s3_upload,
    )


@app.task(acks_late=True)
def get_ocw_next_courses(*, url_paths, force_overwrite, utc_start_timestamp=None):
    """
    Task to sync a batch of OCW Next courses
    """

    if utc_start_timestamp:
        utc_start_timestamp = datetime.strptime(utc_start_timestamp, ISOFORMAT)
        utc_start_timestamp = utc_start_timestamp.replace(tzinfo=pytz.UTC)

    sync_ocw_next_courses(
        url_paths=url_paths,
        force_overwrite=force_overwrite,
        start_timestamp=utc_start_timestamp,
    )


@app.task(bind=True, acks_late=True)
def get_ocw_data(
    self,
    force_overwrite=False,
    upload_to_s3=True,
    course_urls=None,
    utc_start_timestamp=None,
    force_s3_upload=False,
):  # pylint:disable=too-many-locals,too-many-branches,too-many-arguments
    """
    Task to sync OCW course data with database
    """
    if not (
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.OCW_CONTENT_BUCKET_NAME
        and settings.OCW_LEARNING_COURSE_BUCKET_NAME
    ):
        log.warning("Required settings missing for get_ocw_data")
        return

    # get all the courses prefixes we care about
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_CONTENT_BUCKET_NAME)
    ocw_courses = generate_course_prefix_list(raw_data_bucket, course_urls=course_urls)

    total_course_count = len(ocw_courses)

    log.info(
        "Backpopulating %d out of %d OCW courses...",
        len(ocw_courses),
        total_course_count,
    )

    # get a list of blocklisted course ids
    blocklist = load_course_blocklist()

    ocw_tasks = celery.group(
        [
            get_ocw_courses.si(
                course_prefixes=prefixes,
                blocklist=blocklist,
                force_overwrite=force_overwrite,
                upload_to_s3=upload_to_s3,
                utc_start_timestamp=utc_start_timestamp,
                force_s3_upload=force_s3_upload,
            )
            for prefixes in chunks(
                ocw_courses, chunk_size=settings.OCW_ITERATOR_CHUNK_SIZE
            )
        ]
    )
    raise self.replace(ocw_tasks)


@app.task(bind=True, acks_late=True)
def get_ocw_next_data(
    self,
    force_overwrite=False,
    course_url_substring=None,
    utc_start_timestamp=None,
    prefix=None,
):  # pylint:disable=too-many-locals,too-many-branches
    """
    Task to sync OCW Next course data with database
    """
    if not (
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.OCW_NEXT_LIVE_BUCKET
    ):
        log.warning("Required settings missing for get_ocw_data")
        return

    # get all the courses prefixes we care about
    raw_data_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    ).Bucket(name=settings.OCW_NEXT_LIVE_BUCKET)

    ocw_courses = set()
    log.info("Assembling list of courses...")

    if not prefix:
        prefix = "courses/"

    if course_url_substring:
        prefix = prefix + course_url_substring + "/"

    for bucket_file in raw_data_bucket.objects.filter(Prefix=prefix):
        key_pieces = bucket_file.key.split("/")
        if "/".join(key_pieces[:2]) != "":
            path = "/".join(key_pieces[:2]) + "/"
            ocw_courses.add(path)

    if len(ocw_courses) == 0:
        log.info("No courses matching url substring")
        return

    log.info("Backpopulating %d  OCW courses...", len(ocw_courses))

    ocw_tasks = celery.group(
        [
            get_ocw_next_courses.si(
                url_paths=url_path,
                force_overwrite=force_overwrite,
                utc_start_timestamp=utc_start_timestamp,
            )
            for url_path in chunks(
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
        and settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
    ):
        log.warning("Required settings missing for get_ocw_files")
        return
    sync_ocw_course_files(ids)


@app.task(bind=True)
def import_all_ocw_files(self, chunk_size):
    """Import all OCW content files"""
    blocklisted_ids = load_course_blocklist()
    tasks = celery.group(
        [
            get_ocw_files.si(ids)
            for ids in chunks(
                Course.objects.filter(published=True)
                .filter(platform=PlatformType.ocw.value)
                .exclude(course_id__in=blocklisted_ids)
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
        and settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
    ):
        log.warning("Required settings missing for get_xpro_files")
        return
    sync_xpro_course_files(ids)


@app.task(bind=True)
def import_all_xpro_files(self, chunk_size=None):
    """Ingest xPRO OLX files from the S3 bucket"""
    if chunk_size is None:
        chunk_size = settings.LEARNING_COURSE_ITERATOR_CHUNK_SIZE

    blocklisted_ids = load_course_blocklist()
    tasks = celery.group(
        [
            get_xpro_files.si(ids)
            for ids in chunks(
                Course.objects.filter(published=True)
                .filter(platform=PlatformType.xpro.value)
                .exclude(course_id__in=blocklisted_ids)
                .order_by("id")
                .values_list("id", flat=True),
                chunk_size=chunk_size,
            )
        ]
    )

    # to reduce the risk of triggering these multiple times, we trigger and replace this task all at once
    raise self.replace(tasks)


@app.task
def get_mitxonline_files(ids):
    """
    Task to sync MITx Online course files with database
    """
    if not (
        settings.MITX_ONLINE_LEARNING_COURSE_BUCKET_NAME
        and settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
    ):
        log.warning("Required settings missing for get_mitxonline_files")
        return
    sync_mitxonline_course_files(ids)


@app.task(bind=True)
def import_all_mitxonline_files(self, chunk_size=None):
    """Ingest MITx Online files from the S3 bucket"""
    if chunk_size is None:
        chunk_size = settings.LEARNING_COURSE_ITERATOR_CHUNK_SIZE

    blocklisted_ids = load_course_blocklist()
    tasks = celery.group(
        [
            get_mitxonline_files.si(ids)
            for ids in chunks(
                Course.objects.filter(published=True)
                .filter(platform=PlatformType.mitxonline.value)
                .exclude(course_id__in=blocklisted_ids)
                .order_by("id")
                .values_list("id", flat=True),
                chunk_size=chunk_size,
            )
        ]
    )

    # to reduce the risk of triggering these multiple times, we trigger and replace this task all at once
    raise self.replace(tasks)


@app.task
def upload_ocw_parsed_json():
    """
    Task to upload all OCW Course master json data to S3
    """
    s3_bucket = boto3.resource(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
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
            Key=s3_folder + f"/{course.course_id}_parsed.json",
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


@app.task
def get_micromasters_data():
    """Execute the MicroMasters ETL pipeline"""
    pipelines.micromasters_etl()


@app.task
def get_xpro_data():
    """Execute the xPro ETL pipeline"""
    pipelines.xpro_programs_etl()
    pipelines.xpro_courses_etl()


@app.task
def get_mitxonline_data():
    """Execute the MITX Online ETL pipeline"""
    pipelines.mitxonline_courses_etl()
    pipelines.mitxonline_programs_etl()


@app.task
def get_oll_data():
    """Execute the OLL ETL pipeline"""
    pipelines.oll_etl()


@app.task
def get_see_data():
    """Execute the SEE ETL pipeline"""
    pipelines.see_etl()


@app.task
def get_mitpe_data():
    """Execute the MITPE ETL pipeline"""
    pipelines.mitpe_etl()


@app.task
def get_csail_data():
    """Execute the CSAIL ETL pipeline"""
    pipelines.csail_etl()


@app.task
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


@app.task
def get_video_topics(*, video_ids=None):
    """
    Execute the video topics pipeline

    Args:
        video_ids (list of int):
            list of video ids to generate topics for
    """
    pipelines.video_topics_etl(video_ids=video_ids)


@app.task
def get_podcast_data():
    """
    Execute the Podcast ETL pipeline

    Returns:
        int:
            The number of results that were fetched
    """
    results = pipelines.podcast_etl()

    return len(list(results))


@app.task
def update_enrollments_for_email(email):
    """
    Update enrollment data for a single email

    Args:
        email (string): user email
    """
    user = User.objects.filter(email=email).last()
    if not user:
        return

    enrollments.update_enrollments_for_user(user)
