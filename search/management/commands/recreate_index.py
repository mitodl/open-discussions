"""Management command to index reddit content"""
from django.core.management.base import BaseCommand

from open_discussions.utils import now_in_utc
from search.tasks import start_recreate_index


class Command(BaseCommand):
    """Indexes reddit content"""

    help = "Add content to elasticsearch index"

    def handle(self, *args, **options):
        """Index the comments and posts for the channels the user is subscribed to"""
        task = start_recreate_index.delay()
        self.stdout.write(
            "Started celery task {task} to index content".format(task=task)
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Recreate index finished, took {} seconds".format(total_seconds)
        )
