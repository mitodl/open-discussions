"""Shared functions for EdX sites"""
import logging
import os
import re
from subprocess import CalledProcessError, check_call
from tempfile import TemporaryDirectory
from typing import List

from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PlatformType
from course_catalog.etl.loaders import load_content_files
from course_catalog.etl.utils import get_learning_course_bucket, transform_content_files
from course_catalog.models import Course, LearningResourceRun

log = logging.getLogger()


def sync_edx_course_files(
    bucket_name: str, platform: str, ids: List[int], s3_prefix: str = None
):
    """
    Sync all edx course run files for a list of course ids to database

    Args:
        bucket_name(str): Name of S3 bucket
        platform(str): The edx platform
        ids(list of int): list of course ids to process
        s3_prefix(str): path prefix to include in regex for S3
    """
    bucket = get_learning_course_bucket(bucket_name)
    if s3_prefix is None:
        s3_prefix = "courses"

    try:
        course_tar_regex = rf".*/{s3_prefix}/.*\.tar\.gz$"
        most_recent_export_date = next(
            reversed(
                sorted(
                    [
                        obj
                        for obj in bucket.objects.filter(Prefix="20")
                        if re.search(course_tar_regex, obj.key)
                    ],
                    key=lambda obj: obj.last_modified,
                )
            )
        ).key.split("/")[0]
        most_recent_course_zips = [
            obj
            for obj in bucket.objects.filter(Prefix=most_recent_export_date)
            if re.search(course_tar_regex, obj.key)
        ]
    except (StopIteration, IndexError):
        log.warning(
            "No %s exported courses found in S3 bucket %s", platform, bucket_name
        )
        return

    for course_tarfile in most_recent_course_zips:
        matches = re.search(rf"{s3_prefix}/(.+)\.tar\.gz$", course_tarfile.key)
        run_id = matches.group(1)

        runs = LearningResourceRun.objects.filter(
            platform=platform,
            content_type=ContentType.objects.get_for_model(Course),
            object_id__in=ids,
        )
        if platform == PlatformType.mitx.value:
            # Additional processing of run ids and tarfile names, because MITx data is a mess of id/file formats
            run_id = run_id.strip(
                "-course-prod-analytics.xml"
            )  # suffix on edx tar file basename
            potential_run_ids = rf"{run_id.replace('-', '.').replace('+', '.')}"
            runs = runs.filter(run_id__iregex=potential_run_ids)
        else:
            runs = runs.filter(run_id=run_id)
        run = runs.first()

        if not run:
            log.info("No %s course runs matched tarfile %s", platform, course_tarfile)
            continue
        with TemporaryDirectory() as export_tempdir, TemporaryDirectory() as tar_tempdir:
            course_tarpath = os.path.join(
                export_tempdir, course_tarfile.key.split("/")[-1]
            )
            bucket.download_file(course_tarfile.key, course_tarpath)
            try:
                check_call(["tar", "xf", course_tarpath], cwd=tar_tempdir)
            except CalledProcessError:
                log.exception("Unable to untar %s", course_tarfile)
                continue
            try:
                load_content_files(run, transform_content_files(course_tarpath))
            except:  # pylint: disable=bare-except
                log.exception("Error ingesting OLX content data for %s", course_tarfile)
