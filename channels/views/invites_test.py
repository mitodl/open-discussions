"""Test for invite API"""
from operator import attrgetter

from rest_framework import status
from django.urls import reverse
import pytest

from channels.factories.models import ChannelFactory, ChannelInvitationFactory
from channels.models import ChannelInvitation
from open_discussions.test_utils import drf_datetime


@pytest.fixture
def as_non_moderator(mocker):
    """Enforces that the requesting users is treated as a non-moderator"""
    mock_api = mocker.patch("open_discussions.middleware.channel_api.Api").return_value
    mock_api.is_moderator.return_value = False


@pytest.fixture
def as_moderator(mocker):
    """Enforces that the requesting users is treated as a moderator"""
    mock_api = mocker.patch("open_discussions.middleware.channel_api.Api").return_value
    mock_api.is_moderator.return_value = True


@pytest.mark.usefixtures("as_moderator")
def test_list_invites(staff_client):
    """Test that the invite list returns all the invites for the channel"""
    channel = ChannelFactory.create()
    invites = ChannelInvitationFactory.create_batch(5, channel=channel)
    ChannelInvitationFactory.create_batch(5)  # these should not show up

    url = reverse("channel_invitation_api-list", kwargs={"channel_name": channel.name})

    resp = staff_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "id": invite.id,
            "email": invite.email,
            "created_on": drf_datetime(invite.created_on),
            "updated_on": drf_datetime(invite.updated_on),
        }
        for invite in sorted(invites, key=attrgetter("created_on"), reverse=True)
    ]


@pytest.mark.usefixtures("as_non_moderator")
@pytest.mark.parametrize("is_logged_in", [False, True])
def test_list_invites_noauth(client, user, is_logged_in):
    """Test that the invite list returns all the invites for the channel"""
    channel = ChannelFactory.create()

    url = reverse("channel_invitation_api-list", kwargs={"channel_name": channel.name})

    if is_logged_in:
        client.force_login(user)

    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.usefixtures("as_moderator")
def test_create_invite(staff_client, mocker):
    """Test that the invite list creates an invite for the channel"""
    channel = ChannelFactory.create()
    mocker.patch("channels.serializers.invites.tasks")
    email = "text@example.com"
    url = reverse("channel_invitation_api-list", kwargs={"channel_name": channel.name})

    resp = staff_client.post(url, data={"email": email}, format="json")
    invite = ChannelInvitation.objects.first()

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "id": invite.id,
        "email": invite.email,
        "created_on": drf_datetime(invite.created_on),
        "updated_on": drf_datetime(invite.updated_on),
    }


@pytest.mark.usefixtures("as_non_moderator")
@pytest.mark.parametrize("is_logged_in", [False, True])
def test_create_invite_noauth(client, user, mocker, is_logged_in):
    """Test that the invite list creates an invite for the channel"""
    channel = ChannelFactory.create()
    mock_tasks = mocker.patch("channels.serializers.invites.tasks")
    email = "text@example.com"
    url = reverse("channel_invitation_api-list", kwargs={"channel_name": channel.name})

    if is_logged_in:
        client.force_login(user)

    resp = client.post(url, data={"email": email}, format="json")

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert ChannelInvitation.objects.count() == 0
    mock_tasks.send_invitation_email.delay.assert_not_called()


@pytest.mark.usefixtures("as_moderator")
def test_get_invite(staff_client):
    """Test that the invite api returns a single invite"""
    invite = ChannelInvitationFactory.create()

    url = reverse(
        "channel_invitation_api-detail",
        kwargs={"channel_name": invite.channel.name, "pk": invite.id},
    )

    resp = staff_client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "id": invite.id,
        "email": invite.email,
        "created_on": drf_datetime(invite.created_on),
        "updated_on": drf_datetime(invite.updated_on),
    }


@pytest.mark.usefixtures("as_non_moderator")
@pytest.mark.parametrize("is_logged_in", [False, True])
def test_get_invite_noauth(client, user, is_logged_in):
    """Verify that the delete API ignores requests from non-moderator or anonymous users"""
    invite = ChannelInvitationFactory.create()

    url = reverse(
        "channel_invitation_api-detail",
        kwargs={"channel_name": invite.channel.name, "pk": invite.id},
    )

    if is_logged_in:
        client.force_login(user)

    resp = client.get(url)

    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.usefixtures("as_moderator")
def test_delete_invite(staff_client):
    """Test that the invite list deletes an invite"""
    invite = ChannelInvitationFactory.create()

    url = reverse(
        "channel_invitation_api-detail",
        kwargs={"channel_name": invite.channel.name, "pk": invite.id},
    )

    resp = staff_client.delete(url)

    assert resp.status_code == status.HTTP_204_NO_CONTENT
    assert not ChannelInvitation.objects.filter(id=invite.id).exists()


@pytest.mark.usefixtures("as_non_moderator")
@pytest.mark.parametrize("is_logged_in", [False, True])
def test_delete_invite_noauth(client, user, is_logged_in):
    """Verify that the delete API ignores requests from non-moderator or anonymous users"""
    invite = ChannelInvitationFactory.create()

    url = reverse(
        "channel_invitation_api-detail",
        kwargs={"channel_name": invite.channel.name, "pk": invite.id},
    )

    if is_logged_in:
        client.force_login(user)

    resp = client.delete(url)

    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert ChannelInvitation.objects.filter(id=invite.id).exists()
