"""Tests for views for REST APIs for channels"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from open_discussions.constants import NOT_AUTHENTICATED_ERROR_TYPE
from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = [pytest.mark.betamax, pytest.mark.usefixtures("mock_channel_exists")]


def test_list_subscribers(staff_client, staff_api, public_channel):
    """
    The correct list of subscriber usernames is returned.
    """
    users = UserFactory.create_batch(2)
    for user in users:
        staff_api.add_subscriber(user.username, public_channel.name)
    url = reverse("subscriber-list", kwargs={"channel_name": public_channel.name})
    resp = staff_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    for user in users:
        assert {"subscriber_name": user.username} in resp.json()


@pytest.mark.parametrize("attempts", [1, 2])
def test_add_subscriber(staff_client, user, public_channel, attempts):
    """
    Adds a subscriber to a channel as a staff user
    """
    url = reverse("subscriber-list", kwargs={"channel_name": public_channel.name})
    for _ in range(attempts):
        resp = staff_client.post(
            url, data={"subscriber_name": user.username}, format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json() == {"subscriber_name": user.username}


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
def test_add_subscriber_anonymous(
    client, user, public_channel, settings, allow_anonymous
):
    """
    Anonymous users can't add subscribers
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse("subscriber-list", kwargs={"channel_name": public_channel.name})
    resp = client.post(url, data={"subscriber_name": user.username}, format="json")
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
def test_detail_subscriber_anonymous(
    client, user, public_channel, settings, allow_anonymous
):
    """Anonymous users can't see subscriber information"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse(
        "subscriber-detail",
        kwargs={"channel_name": public_channel.name, "subscriber_name": user.username},
    )
    resp = client.get(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


@pytest.mark.parametrize("attempts", [1, 2])
def test_remove_subscriber(staff_client, staff_api, user, public_channel, attempts):
    """
    Removes a subscriber from a channel
    """
    staff_api.add_subscriber(user.username, public_channel.name)
    url = reverse(
        "subscriber-detail",
        kwargs={"channel_name": public_channel.name, "subscriber_name": user.username},
    )
    for _ in range(attempts):
        resp = staff_client.delete(url)
        assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_remove_subscriber_anonymous(
    client, user, public_channel, settings, allow_anonymous
):
    """Anonymous users can't remove subscribers"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse(
        "subscriber-detail",
        kwargs={"channel_name": public_channel.name, "subscriber_name": user.username},
    )
    resp = client.delete(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE
