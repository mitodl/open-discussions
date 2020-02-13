"""Management command for populating ocw course run file data"""

from django.core.management import BaseCommand

from course_catalog.tasks import import_all_ocw_files
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Populate ocw course run files"""

    help = "Populate ocw course run files"

    def handle(self, *args, **options):
        """Run Populate ocw course run files"""
        task = import_all_ocw_files.delay()
        self.stdout.write(
            "Started task {task} to get ocw course run file data".format(task=task)
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of ocw file data finished, took {} seconds".format(
                total_seconds
            )
        )
