"""Tests for views for REST APIs for channels"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from channels.factories import ChannelFactory
from open_discussions.constants import NOT_AUTHENTICATED_ERROR_TYPE
from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = [pytest.mark.betamax, pytest.mark.usefixtures("mock_channel_exists")]


def test_list_subscribers_not_allowed(staff_client):
    """
    Get method not allowed on the list of subscribers
    """
    channel = ChannelFactory.create()
    url = reverse("subscriber-list", kwargs={"channel_name": channel.name})
    assert staff_client.get(url).status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_add_subscriber(staff_client):
    """
    Adds a subscriber to a channel as a staff user
    """
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse("subscriber-list", kwargs={"channel_name": "admin_channel"})
    resp = staff_client.post(
        url, data={"subscriber_name": subscriber.username}, format="json"
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {"subscriber_name": subscriber.username}


def test_add_subscriber_mod(client, public_channel, staff_api, reddit_factories):
    """
    Adds a subscriber to a channel as a moderator
    """
    moderator = reddit_factories.user("new_mod_user")
    new_subscriber = reddit_factories.user("new_sub_user")
    staff_api.add_moderator(moderator.username, public_channel.name)
    client.force_login(moderator)
    url = reverse("subscriber-list", kwargs={"channel_name": public_channel.name})
    resp = client.post(
        url, data={"subscriber_name": new_subscriber.username}, format="json"
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {"subscriber_name": new_subscriber.username}


def test_add_subscriber_again(staff_client):
    """
    If a user is already part of a channel we should return a 201 status
    """
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse("subscriber-list", kwargs={"channel_name": "admin_channel"})
    resp = staff_client.post(
        url, data={"subscriber_name": subscriber.username}, format="json"
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {"subscriber_name": subscriber.username}


def test_add_subscriber_forbidden(staff_client):
    """
    If a user gets a 403 from praw we should return a 403 status
    """
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse("subscriber-list", kwargs={"channel_name": "admin_channel"})
    resp = staff_client.post(
        url, data={"subscriber_name": subscriber.username}, format="json"
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_add_subscriber_anonymous(client, settings, allow_anonymous):
    """
    Anonymous users can't add subscribers
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse("subscriber-list", kwargs={"channel_name": "admin_channel"})
    resp = client.post(
        url, data={"subscriber_name": subscriber.username}, format="json"
    )
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_detail_subscriber(user_client, private_channel_and_contributor):
    """
    Detail of a subscriber in a channel
    """
    channel, contributor = private_channel_and_contributor
    url = reverse(
        "subscriber-detail",
        kwargs={"channel_name": channel.name, "subscriber_name": contributor.username},
    )
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {"subscriber_name": contributor.username}


def test_detail_subscriber_missing(user_client, private_channel, user):
    """
    A missing subscriber should generate a 404
    """
    url = reverse(
        "subscriber-detail",
        kwargs={"channel_name": private_channel.name, "subscriber_name": user.username},
    )
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_detail_subscriber_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't see subscriber information"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse(
        "subscriber-detail",
        kwargs={
            "channel_name": "admin_channel",
            "subscriber_name": subscriber.username,
        },
    )
    resp = client.get(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_remove_subscriber(staff_client):
    """
    Removes a subscriber from a channel
    """
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse(
        "subscriber-detail",
        kwargs={
            "channel_name": "admin_channel",
            "subscriber_name": subscriber.username,
        },
    )
    resp = staff_client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_subscriber_again(staff_client):
    """
    The API should return a 204 even if the user isn't there
    """
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse(
        "subscriber-detail",
        kwargs={
            "channel_name": "admin_channel",
            "subscriber_name": subscriber.username,
        },
    )
    resp = staff_client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_remove_subscriber_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't remove subscribers"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    subscriber = UserFactory.create(username="01BTN6G82RKTS3WF61Q33AA0ND")
    url = reverse(
        "subscriber-detail",
        kwargs={
            "channel_name": "admin_channel",
            "subscriber_name": subscriber.username,
        },
    )
    resp = client.delete(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE
