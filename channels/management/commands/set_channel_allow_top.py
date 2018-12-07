"""Management command to set allow_top on channels"""
import sys

from django.core.management.base import BaseCommand

from channels.api import get_admin_api
from channels.models import Channel


class Command(BaseCommand):
    """Sets allow_top=True on channels"""

    help = "Sets allow_top=True on channels"

    def add_arguments(self, parser):
        parser.add_argument("--name", nargs="?", action="append")
        parser.add_argument("--allow-top", action="store", default=True)

    def handle(self, *args, **options):
        """Sets allow_top on channels"""
        channels = Channel.objects.all()

        allow_top = options["allow_top"]

        if options["name"]:
            channels = channels.filter(name__in=options["name"])

        api = get_admin_api()

        self.stdout.write("Found {} channels to update".format(channels.count()))

        failed = False
        for channel in channels:
            try:
                api.update_channel(channel.name, allow_top=allow_top)
                self.stdout.write(
                    self.style.SUCCESS(
                        "Channel '{}' SUCCESS: set allow_top={}".format(
                            channel.name, allow_top
                        )
                    )
                )
            except Exception as exc:  # pylint: disable=broad-except
                self.stderr.write(
                    "Channel '{}' ERROR: {}".format(channel.name, str(exc))
                )
                failed = True

        if failed:
            sys.exit(1)
