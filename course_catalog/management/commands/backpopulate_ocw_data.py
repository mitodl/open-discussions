"""Management command for populating ocw course data"""
from django.core.management import BaseCommand

from course_catalog.models import Course
from course_catalog.tasks import get_ocw_data
from open_discussions.constants import ISOFORMAT
from open_discussions.utils import now_in_utc
from search.task_helpers import delete_course


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
            help="If set, backpopulate only courses whose urls match with this substring",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate ocw courses"""
        course_url_substring = options.get("course_url_substring")
        if options["delete"]:
            self.stdout.write("Deleting all existing OCW courses")
            for course in Course.objects.filter(platform="ocw"):
                course.delete()
                delete_course(course)
        else:
            start = now_in_utc()

            task = get_ocw_data.delay(
                force_overwrite=options["force_overwrite"],
                upload_to_s3=options["upload_to_s3"],
                course_url_substring=course_url_substring,
                utc_start_timestamp=start.strftime(ISOFORMAT),
            )

            self.stdout.write(
                "Started task {task} to get ocw course data "
                "w/force_overwrite={overwrite}, upload_to_s3={s3}, course_url_substring={course_url_substring}".format(
                    task=task,
                    overwrite=options["force_overwrite"],
                    s3=options["upload_to_s3"],
                    course_url_substring=course_url_substring,
                )
            )
            self.stdout.write("Waiting on task...")
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of ocw data finished, took {} seconds".format(total_seconds)
            )
