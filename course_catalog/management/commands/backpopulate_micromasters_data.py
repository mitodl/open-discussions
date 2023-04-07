"""Management command for populating micromasters course data"""
from django.core.management import BaseCommand

from course_catalog.constants import PlatformType
from course_catalog.models import Program
from course_catalog.tasks import get_micromasters_data
from open_discussions.utils import now_in_utc
from search.task_helpers import delete_program


class Command(BaseCommand):
    """Populate micromasters programs and courses"""

    help = "Populate micromasters programs and courses"

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            dest="delete",
            action="store_true",
            help="Delete all existing programs",
        )
        super().add_arguments(parser)

    def handle(self, *args, **options):
        """Run Populate micromasters courses"""
        if options["delete"]:
            self.stdout.write(
                "Deleting all existing xPro programs from database and OpenSearch"
            )
            # NOTE: we only delete programs, because courses are owned by the MITx integration
            for program in Program.objects.filter(
                platform=PlatformType.micromasters.value
            ):
                delete_program(program)
        else:
            task = get_micromasters_data.delay()
            self.stdout.write(f"Started task {task} to get micromasters course data")
            self.stdout.write("Waiting on task...")
            start = now_in_utc()
            task.get()
            total_seconds = (now_in_utc() - start).total_seconds()
            self.stdout.write(
                "Population of micromasters data finished, took {} seconds".format(
                    total_seconds
                )
            )
