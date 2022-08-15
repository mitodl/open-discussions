"""Signals for channels"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from guardian.shortcuts import assign_perm

from channels.constants import WIDGET_LIST_CHANGE_PERM
from channels_fields.api import create_field_groups_and_roles
from channels_fields.constants import FIELD_ROLE_MODERATORS
from channels_fields.models import FieldChannel
from widgets.models import WidgetList


@receiver(
    post_save,
    sender=FieldChannel,
    dispatch_uid="channelmembershipconfig_post_save",
)
def handle_create_field_channel(
    sender, instance, created, **kwargs
):  # pylint: disable=unused-argument
    """
    Create a WidgetList and permissions group for each new FieldChannel.
    """
    if created:
        widget = WidgetList.objects.create()
        widget.field_channel.set([instance])
        roles = create_field_groups_and_roles(instance)
        moderator_group = roles[FIELD_ROLE_MODERATORS].group
        assign_perm(WIDGET_LIST_CHANGE_PERM, moderator_group, instance.widget_list)
