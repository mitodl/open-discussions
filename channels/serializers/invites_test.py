"""Tests for ChannelInvitationSerializer"""
import pytest

from channels.factories.models import ChannelFactory
from channels.models import ChannelInvitation
from channels.serializers.invites import ChannelInvitationSerializer

pytestmark = [pytest.mark.usefixtures("authenticated_site")]


def test_invite_create_email(user, mocker):
    """Invites a user by email"""
    mock_tasks = mocker.patch("channels.serializers.invites.tasks")
    channel = ChannelFactory.create()
    email = "test@example.com"
    result = ChannelInvitationSerializer(
        context={"channel": channel, "inviter": user}
    ).create({"email": email})

    invite = ChannelInvitation.objects.get(channel=channel, email=email)

    mock_tasks.send_invitation_email.delay.assert_called_once_with(invite.id)

    assert result == invite
    assert result.email == email
    assert result.inviter == user
    assert result.channel == channel


def test_invite_create_email_error(user, mocker):
    """Rolls back invite record if the celert task fails to queue"""
    mock_tasks = mocker.patch("channels.serializers.invites.tasks")
    mock_tasks.send_invitation_email.delay.side_effect = Exception()
    channel = ChannelFactory.create()
    email = "test@example.com"

    with pytest.raises(Exception):
        ChannelInvitationSerializer(
            context={"channel": channel, "inviter": user}
        ).create({"email": email})

    assert not ChannelInvitation.objects.filter(channel=channel, email=email).exists()
