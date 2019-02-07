"""Management command for populating ocw course data"""
from django.core.management import BaseCommand

from course_catalog.tasks import get_ocw_data
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Populate ocw courses"""

    help = "Populate ocw courses"

    def handle(self, *args, **options):
        """Run Populate edx courses"""
        task = get_ocw_data.delay()
        self.stdout.write(
            "Started celery task {task} to get ocw course data".format(task=task)
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of ocw data finished, took {} seconds".format(total_seconds)
        )
