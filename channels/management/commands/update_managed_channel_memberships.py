"""Update managed channel memberships"""
from django.core.management.base import BaseCommand

from channels import tasks
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Update managed channel memberships"""

    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument("channel_names", metavar="CHANNEL_NAME", nargs="+")

    def handle(self, *args, **options):
        task = tasks.update_memberships_for_managed_channels.delay(
            channel_names=options["channel_names"]
        )

        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Updated user channel memberships, took {} seconds".format(total_seconds)
        )
