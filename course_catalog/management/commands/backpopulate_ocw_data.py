"""Management command for populating ocw course data"""
import json

from django.core.management import BaseCommand

from course_catalog.models import Course
from course_catalog.tasks import get_ocw_data
from open_discussions.constants import ISOFORMAT
from open_discussions.utils import now_in_utc
from search.task_helpers import deindex_course


class Command(BaseCommand):
    """Populate ocw courses"""

    help = "Populate ocw courses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            dest="force_overwrite",
            action="store_true",
            help="Overwrite any existing records",
        )
        parser.add_argument(
            "--force-s3",
            dest="force_s3_upload",
            action="store_true",
            help="Force all parsed json to be generated/uploaded to S3",
        )
        parser.add_argument(
            "--delete",
            dest="delete",
            action="store_true",
            help="Delete all existing records first",
        )
        parser.add_argument(
            "--skip-s3",
            dest="upload_to_s3",
            action="store_false",
            help="skip uploading course files to s3",
        )
        parser.add_argument(
            "--course-url-substring",
            dest="course_url_substring",
            required=False,
            help="If set, backpopulate only the course whose urls match with this substring",
        )
        parser.add_argument(
            "--course-url-json",
            dest="course_url_json",
            required=False,
            help="If set, backpopulate only courses whose urls match with the list of strings in this JSON file",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate ocw courses"""

        course_url_json = options.get("course_url_json")
        if course_url_json:
            with open(course_url_json) as input_file:
                course_urls = json.load(input_file)
            course_url_substring = None
        else:
            course_url_substring = options.get("course_url_substring")
            if course_url_substring:
                course_urls = [
                    course_url.strip()
                    for course_url in course_url_substring.split(",")
                    if course_url
                ]
            else:
                course_urls = None
        if options["delete"]:
            self.stdout.write("Deleting all existing OCW courses")
            for course in Course.objects.filter(platform="ocw", ocw_next_course=False):
                course.delete()
                deindex_course(course)
        else:
            start = now_in_utc()

            task = get_ocw_data.delay(
                force_overwrite=options["force_overwrite"],
                upload_to_s3=options["upload_to_s3"],
                course_urls=course_urls,
                utc_start_timestamp=start.strftime(ISOFORMAT),
                force_s3_upload=options["force_s3_upload"],
            )

            self.stdout.write(
                "Started task {task} to get ocw course data "
                "w/force_overwrite={overwrite}, force_s3_upload={force_s3}, upload_to_s3={s3}, course_url_substring={course_url_substring}".format(
                    task=task,
                    overwrite=options["force_overwrite"],
                    s3=options["upload_to_s3"],
                    course_url_substring=course_url_substring,
                    force_s3=options["force_s3_upload"],
                )
            )
            self.stdout.write("Waiting on task...")
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of ocw data finished, took {} seconds".format(total_seconds)
            )
