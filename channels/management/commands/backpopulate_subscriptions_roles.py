"""Management command to create/update each user's channels.models.ChannelSubscription"""
from django.core.management.base import BaseCommand

from channels.tasks import populate_subscriptions_and_roles
from open_discussions.utils import now_in_utc


class Command(BaseCommand):
    """Create/update each user's channel subscriptions and moderator/contributor roles"""

    help = "Create/update each user's ChannelSubscriptions and ChannelRoles (subscriber, moderator, contributor)"

    def handle(self, *args, **options):
        """Adds the indexing user as the moderator on all channels"""
        task = populate_subscriptions_and_roles.delay()
        self.stdout.write(
            "Started celery task {task} to populate channel user roles and subscriptions".format(
                task=task
            )
        )
        self.stdout.write("Waiting on task...")
        start = now_in_utc()
        task.get()
        total_seconds = (now_in_utc() - start).total_seconds()
        self.stdout.write(
            "Population of channel user roles and subscriptions finished, took {} seconds".format(
                total_seconds
            )
        )
