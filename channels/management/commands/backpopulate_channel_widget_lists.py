"""Management command to create Channel WidgetList records"""
from django.db import transaction
from django.core.management.base import BaseCommand
from guardian.shortcuts import assign_perm

from channels.api import get_admin_api
from channels.constants import ROLE_MODERATORS, WIDGET_LIST_CHANGE_PERM
from channels.models import Channel
from widgets.models import WidgetList, WidgetInstance
from widgets.serializers.markdown import MarkdownWidgetSerializer


class Command(BaseCommand):
    """Create Channel WidgetList records"""

    help = "Create Channel WidgetList records"

    def handle(self, *args, **options):
        """Adds WidgetLists to existing channels"""
        api = get_admin_api()
        for channel_id in Channel.objects.values_list("id", flat=True):
            with transaction.atomic():
                channel = Channel.objects.select_for_update().get(id=channel_id)
                self.stdout.write(f"Channel: {channel.name}")

                subreddit = api.get_channel(channel.name)
                widget_list = None

                if channel.widget_list is None:
                    widget_list = WidgetList.objects.create()
                    WidgetInstance.objects.create(
                        widget_list=widget_list,
                        widget_type=MarkdownWidgetSerializer.name,
                        title="About this channel",
                        configuration={"source": subreddit.description},
                        position=0,
                    )

                    channel.widget_list = widget_list
                    channel.save()

                moderator_group_role = (
                    channel.channelgrouprole_set.filter(role=ROLE_MODERATORS)
                    .select_for_update()
                    .first()
                )

                if moderator_group_role:
                    assign_perm(
                        WIDGET_LIST_CHANGE_PERM,
                        moderator_group_role.group,
                        channel.widget_list,
                    )
                    self.stdout.write(f"Permission added: {WIDGET_LIST_CHANGE_PERM}")
                else:
                    self.stderr.write("\tNo moderator group found")
        self.stdout.write("Done")
