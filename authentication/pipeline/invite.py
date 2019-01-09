"""Pipeline functions for channel invitations"""
from channels.api import get_admin_api
from channels.models import ChannelInvitation


def resolve_outstanding_channel_invites(
    strategy, backend, user=None, is_new=False, *args, **kwargs
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
    for channel_invite in (
        ChannelInvitation.objects.select_for_update()
        .filter(email=user.email, redeemed=False)
        .prefetch_related("channel")
    ):
        api.add_contributor(user.username, channel_invite.channel.name)
        api.add_subscriber(user.username, channel_invite.channel.name)

        channel_invite.user = user
        channel_invite.redeemed = True
        channel_invite.save()

    return {}
