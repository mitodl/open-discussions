"""Populates user subscriptions into a new default channel"""
from django.core.management.base import BaseCommand

from channels import tasks


class Command(BaseCommand):
    """Populates user subscriptions into a new default channel"""

    help = "Populates user subscriptions into a new default channel"

    def add_arguments(self, parser):
        parser.add_argument("channel_name", type=str)

    def handle(self, *args, **options):
        tasks.subscribe_all_users_to_default_channel.delay(
            channel_name=options["channel_name"]
        )
