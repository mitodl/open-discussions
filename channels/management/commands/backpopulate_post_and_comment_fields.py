"""Management command to backpopulate post and comment fields"""
from django.core.management.base import BaseCommand

from channels.tasks import populate_post_and_comment_fields
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Backpopulates post and comment fields"""

    help = "Backpopulates post and comment fields"

    def handle(self, *args, **options):
        """Backpopulates post and comment fields"""
        task = populate_post_and_comment_fields.delay()
        self.stdout.write(
            "Started celery task {task} to backpopulate post and comment fields".format(
                task=task
            )
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Backpopulate of post and comment fields finished, took {} seconds".format(
                total_seconds
            )
        )
