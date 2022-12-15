"""Management command for populating prolearn course/program data"""
from django.core.management import BaseCommand

from course_catalog.etl.prolearn import PROLEARN_DEPARTMENT_MAPPING
from course_catalog.models import Course, Program
from course_catalog.tasks import get_prolearn_data
from open_discussions.utils import now_in_utc
from search.task_helpers import delete_course, delete_program


class Command(BaseCommand):
    """Populate prolearn courses"""

    help = "Populate prolearn courses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            dest="delete",
            action="store_true",
            help="Delete all existing records first",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate prolearn courses"""
        if options["delete"]:
            self.stdout.write(
                "Deleting all existing prolearn courses from database and ElasticSearch"
            )
            for course in Course.objects.filter(
                platform__in=PROLEARN_DEPARTMENT_MAPPING.keys()
            ):
                course.delete()
                delete_course(course)
        else:
            task = get_prolearn_data.delay()
            self.stdout.write(
                f"Started task {task} to get prolearn course/program data"
            )
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of prolearn data finished, took {} seconds".format(
                    total_seconds
                )
            )
