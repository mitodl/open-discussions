"""Management command for populating xpro course data"""
from django.core.management import BaseCommand

from course_catalog.constants import PlatformType
from course_catalog.models import Course
from course_catalog.tasks import get_xpro_data
from open_discussions.utils import now_in_utc
from search.task_helpers import deindex_course


class Command(BaseCommand):
    """Populate xpro courses"""

    help = "Populate xpro courses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            dest="delete",
            action="store_true",
            help="Delete all existing records first",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate xpro courses"""
        if options["delete"]:
            self.stdout.write(
                "Deleting all existing xPro courses from database and opensearch"
            )
            for course in Course.objects.filter(platform=PlatformType.xpro.value):
                course.delete()
                deindex_course(course)
        else:
            task = get_xpro_data.delay()
            self.stdout.write(f"Started task {task} to get xpro course data")
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of xpro data finished, took {} seconds".format(
                    total_seconds
                )
            )
