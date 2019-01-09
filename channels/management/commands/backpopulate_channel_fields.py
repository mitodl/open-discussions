"""Management command to backpopulate channel fields"""
from django.core.management.base import BaseCommand

from channels.tasks import populate_channel_fields
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Backpopulate channel fields from reddit"""

    help = "Backpopulate channel fields from reddit"

    def handle(self, *args, **options):
        """Run celery task to backpopulate channel fields from reddit"""
        task = populate_channel_fields.delay()
        self.stdout.write(
            "Started celery task {task} to populate channel fieldss".format(task=task)
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of channel fields finished, took {} seconds".format(
                total_seconds
            )
        )
