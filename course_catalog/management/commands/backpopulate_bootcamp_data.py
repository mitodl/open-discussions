"""Management command for populating bootcamp data"""
from django.core.management import BaseCommand

from course_catalog.models import Bootcamp
from course_catalog.tasks import get_bootcamp_data
from open_discussions.utils import now_in_utc
from search.task_helpers import delete_bootcamp


class Command(BaseCommand):
    """Populate bootcamp courses"""

    help = "Populate bootcamp courses"

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
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate bootcamp courses"""
        if options["delete"]:
            self.stdout.write(
                "Deleting all existing bootcamps from database and ElasticSearch"
            )
            for bootcamp in Bootcamp.objects.iterator():
                bootcamp.delete()
                delete_bootcamp(bootcamp)
        else:
            task = get_bootcamp_data.delay(force_overwrite=options["force_overwrite"])
            self.stdout.write(
                "Started task {task} to get bootcamp data w/force_overwrite={overwrite}".format(
                    task=task, overwrite=options["force_overwrite"]
                )
            )
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of bootcamp data finished, took {} seconds".format(
                    total_seconds
                )
            )
