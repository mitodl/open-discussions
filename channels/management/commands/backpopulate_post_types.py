"""Management command to set channel allowed_post_types and post post_types"""
from django.core.management.base import BaseCommand

from channels.tasks import populate_post_and_channel_types
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Set channel allowed_post_types and post post_types"""

    help = "Set channel allowed_post_types and post post_types"

    def handle(self, *args, **options):
        """Set channel allowed_post_types and post post_types"""
        task = populate_post_and_channel_types.delay()
        self.stdout.write(
            "Started celery task {task} to populate allowed_post_types and post_types".format(
                task=task
            )
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of allowed_post_types and post_types finished, took {} seconds".format(
                total_seconds
            )
        )
