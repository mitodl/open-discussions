"""Command to populate user notification settings"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from notifications import api


class Command(BaseCommand):
    """Populates user notification setting"""

    help = "Populates user notification settings"

    def add_arguments(self, parser):
        parser.add_argument("--username", nargs="?", action="append")
        parser.add_argument("--inactive", action="store_true", default=False)

    def handle(self, *args, **options):
        users = get_user_model().objects.all()

        if not options["inactive"]:
            # unless the --inactive flag is specified, default to the safer subset of active users
            users = users.filter(profile__last_active_on__isnull=False)

        if options["username"]:
            users = users.filter(username__in=options["username"])

        for user in users.iterator():
            api.ensure_notification_settings(user)
