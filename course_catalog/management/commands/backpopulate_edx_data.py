"""Management command for populating edx course data"""
from django.core.management import BaseCommand

from course_catalog.models import Course
from course_catalog.tasks import sync_and_upload_edx_data
from open_discussions.utils import now_in_utc
from search.task_helpers import delete_course


class Command(BaseCommand):
    """Populate edx courses"""

    help = "Populate edx courses"

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
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate edx courses"""
        if options["delete"]:
            self.stdout.write(
                "Deleting all existing MITx courses from database and ElasticSearch"
            )
            for course in Course.objects.filter(platform="mitx"):
                course.delete()
                delete_course(course)
        task = sync_and_upload_edx_data.delay(
            force_overwrite=options["force_overwrite"],
            upload_to_s3=options["upload_to_s3"],
        )
        self.stdout.write(
            "Started task {task} to get edx course data w/force_overwrite={overwrite}, upload_to_s3={s3}".format(
                task=task,
                overwrite=options["force_overwrite"],
                s3=options["upload_to_s3"],
            )
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of edx data finished, took {} seconds".format(total_seconds)
        )
