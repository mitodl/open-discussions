"""Management command for populating xpro course run file data"""

from django.core.management import BaseCommand

from course_catalog.tasks import get_all_xpro_files
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Populate xpro course run files"""

    help = "Populate xpro course run files"

    def handle(self, *args, **options):
        """Run Populate xpro course run files"""
        task = get_all_xpro_files.delay()
        self.stdout.write(
            "Started task {task} to get xpro course run file data".format(task=task)
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of xpro file data finished, took {} seconds".format(
                total_seconds
            )
        )
