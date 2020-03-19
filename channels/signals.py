"""Signals for channels"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from channels.models import ChannelMembershipConfig
from moira_lists.tasks import update_moira_list_users
from open_discussions import features


@receiver(
    post_save,
    sender=ChannelMembershipConfig,
    dispatch_uid="channelmembershipconfig_post_save",
)
def handle_create_course_run_certificate(
    sender, instance, created, **kwargs
):  # pylint: disable=unused-argument
    """
    Update moira lists when a ChannelMembershipConfig model is saved.
    """
    if "moira_lists" in instance.query and features.is_enabled(features.MOIRA):
        update_moira_list_users.delay(
            instance.query.get("moira_lists", []),
            channel_ids=[
                channel_id
                for channel_id in instance.channels.values_list("id", flat=True)
            ],
        )
