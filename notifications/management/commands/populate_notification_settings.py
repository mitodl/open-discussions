"""Command to populate user notification settings"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from notifications import api


class Command(BaseCommand):
    """Populates user notification setting"""

    help = "Populates user notification settings"

    def add_arguments(self, parser):
        parser.add_argument("--username", nargs="?", action="append")

    def handle(self, *args, **options):
        users = get_user_model().objects.all()

        if options["username"]:
            users = users.filter(username__in=options["username"])

        for user in users.iterator():
            api.ensure_notification_settings(user)
