"""Management command for populating edx course data"""
from django.core.management import BaseCommand

from course_catalog.constants import PlatformType
from course_catalog.models import Course
from course_catalog.tasks import get_mitx_data
from open_discussions.utils import now_in_utc
from search.search_index_helpers import deindex_course


class Command(BaseCommand):
    """Populate edx courses"""

    help = "Populate edx courses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            dest="delete",
            action="store_true",
            help="Delete all existing records first",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate edx courses"""
        if options["delete"]:
            self.stdout.write(
                "Deleting all existing MITx courses from database and opensearch"
            )
            for course in Course.objects.filter(platform=PlatformType.mitx.value):
                course.delete()
                deindex_course(course)
        else:
            task = get_mitx_data.delay()
            self.stdout.write(f"Started task {task} to get edx course data")
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                f"Population of edx data finished, took {total_seconds} seconds"
            )
