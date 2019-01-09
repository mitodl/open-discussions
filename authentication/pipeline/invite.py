"""Pipeline functions for channel invitations"""
from django.db import transaction

from channels.api import get_admin_api
from channels.models import ChannelInvitation


def resolve_outstanding_channel_invites(
    strategy, backend, *args, user=None, is_new=False, **kwargs
):  # pylint: disable=unused-argument
    """
    Resolves outstanding channel invitations when a user joins

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        is_new (bool): True if the user just got created
    """
    if not is_new:
        return {}

    admin_api = get_admin_api()

    # resolve all channel invitations by adding the user as a contributor and a subscriber
    for invite_id in ChannelInvitation.objects.filter(
        email=user.email, redeemed=False
    ).values_list("id", flat=True):
        # redeem the update such that any error here will rollback the redemption
        with transaction.atomic():
            channel_invite = ChannelInvitation.objects.select_for_update().get(
                id=invite_id
            )
            channel_invite.user = user
            channel_invite.redeemed = True
            channel_invite.save()

            admin_api.add_contributor(user.username, channel_invite.channel.name)
            admin_api.add_subscriber(user.username, channel_invite.channel.name)

    return {}
