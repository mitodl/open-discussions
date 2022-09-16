"""Shared functions for EdX sites"""
import logging
import os
import re
from subprocess import CalledProcessError, check_call
from tempfile import TemporaryDirectory

from django.contrib.contenttypes.models import ContentType

from course_catalog.etl.loaders import load_content_files
from course_catalog.etl.utils import get_learning_course_bucket, transform_content_files
from course_catalog.models import Course, LearningResourceRun
from course_catalog.utils import get_s3_object_and_read

log = logging.getLogger()


def sync_edx_course_files(bucket_name, platform, ids):
    """
    Sync all edx course run files for a list of course ids to database

    Args:
        ids(list of int): list of course ids to process
    """
    bucket = get_learning_course_bucket(bucket_name)

    try:
        course_tar_regex = r".*/courses/.*\.tar\.gz$"
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
        matches = re.search(r"courses/(.+)\.tar\.gz$", course_tarfile.key)
        run = LearningResourceRun.objects.filter(
            platform=platform,
            run_id=matches.group(1),
            content_type=ContentType.objects.get_for_model(Course),
            object_id__in=ids,
        ).first()
        if not run:
            log.info(
                "No %s courses matched course tarfile %s", platform, course_tarfile
            )
            continue
        with TemporaryDirectory() as export_tempdir, TemporaryDirectory() as tar_tempdir:
            tarbytes = get_s3_object_and_read(course_tarfile)
            course_tarpath = os.path.join(
                export_tempdir, course_tarfile.key.split("/")[-1]
            )
            with open(course_tarpath, "wb") as f:
                f.write(tarbytes)
            try:
                check_call(["tar", "xf", course_tarpath], cwd=tar_tempdir)
            except CalledProcessError:
                log.exception("Unable to untar %s", course_tarfile)
                continue
            try:
                load_content_files(run, transform_content_files(course_tarpath))
            except:  # pylint: disable=bare-except
                log.exception("Error ingesting OLX content data for %s", course_tarfile)
