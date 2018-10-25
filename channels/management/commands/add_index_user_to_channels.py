"""Management command to add the indexing user account as a moderator to all channels"""
import sys

from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from prawcore import Forbidden

from channels.api import Api
from channels.models import Channel


class Command(BaseCommand):
    """Add indexing user as moderator to all channels"""

    help = "Add indexing user as moderator to all channels"

    def handle(self, *args, **options):
        """Adds the indexing user as the moderator on all channels"""

        index_api = Api(User.objects.get(username=settings.INDEXING_API_USERNAME))
        failed = False
        for channel in Channel.objects.values_list("name", flat=True):
            processed = False
            for user in User.objects.filter(is_staff=True):
                user_api = Api(user)
                try:
                    existing_mods = sorted(
                        user_api.list_moderators(channel),
                        key=lambda moderator: moderator.date,
                    )
                    if settings.INDEXING_API_USERNAME not in [
                        mod.name for mod in existing_mods
                    ]:
                        if existing_mods and existing_mods[0].name != user.username:
                            # First mod is most powerful mod, use that one.
                            user_api = Api(User.objects.get(username=existing_mods[0]))
                        # Add the indexing user as moderator if not present
                        user_api.add_moderator(settings.INDEXING_API_USERNAME, channel)
                        # Remove all the old moderators in reverse order
                        for mod in reversed(existing_mods):
                            user_api.remove_moderator(mod.name, channel)
                        # Add back all the old moderators in original order
                        for mod in existing_mods:
                            index_api.add_moderator(mod.name, channel)
                        self.stdout.write(
                            self.style.SUCCESS(
                                "Channel '{}' SUCCESS: Indexing user added.".format(
                                    channel
                                )
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                "Channel '{}' Indexing user already present.".format(
                                    channel
                                )
                            )
                        )
                    processed = True
                    break
                except Forbidden:
                    # Just try the next user
                    pass
                except Exception as exc:  # pylint: disable=broad-except
                    self.stderr.write(
                        "Channel '{}' ERROR: {}".format(channel, str(exc))
                    )
                    failed = True
            if not processed:
                self.stderr.write(
                    "No working user found for Channel '{}'".format(channel)
                )
                failed = True

        if failed:
            sys.exit(1)
