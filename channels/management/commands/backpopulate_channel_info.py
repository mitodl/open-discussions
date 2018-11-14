"""Management command to backpopulate channel info"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from channels.api import Api, sync_channel_model


User = get_user_model()


class Command(BaseCommand):
    """Populate channel information"""

    help = "Create/update each user's ChannelSubscriptions and ChannelRoles (subscriber, moderator, contributor)"

    def handle(self, *args, **options):
        user = User.objects.get(username=settings.INDEXING_API_USERNAME)
        client = Api(user)

        for reddit_channel in client.list_channels():
            channel = sync_channel_model(reddit_channel.display_name)
            channel.channel_type = reddit_channel.subreddit_type
            channel.save()
