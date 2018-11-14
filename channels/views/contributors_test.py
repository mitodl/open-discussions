"""Tests for views for REST APIs for contributors"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from open_discussions.constants import NOT_AUTHENTICATED_ERROR_TYPE
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = [pytest.mark.betamax, pytest.mark.usefixtures("mock_channel_exists")]


def test_list_contributors(
    staff_client, private_channel_and_contributor, staff_user, settings
):
    """
    List contributors in a channel
    """
    settings.INDEXING_API_USERNAME = staff_user.username
    channel, user = private_channel_and_contributor
    url = reverse("contributor-list", kwargs={"channel_name": channel.name})
    resp = staff_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    # staff user is filtered out
    assert resp.json() == [
        {
            "contributor_name": user.username,
            "full_name": user.profile.name,
            "email": user.email,
        }
    ]


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_list_contributors_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't list contributors in a channel"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    # Well, maybe we could allow it but there's no point since this list is only meaningful for private channels.
    url = reverse("contributor-list", kwargs={"channel_name": "some_channel"})
    resp = client.get(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


@pytest.mark.parametrize("attempts", [1, 2])
def test_add_contributor(staff_client, user, private_channel, attempts):
    """
    Adds a contributor to a channel
    """
    url = reverse("contributor-list", kwargs={"channel_name": private_channel.name})
    for _ in range(attempts):
        resp = staff_client.post(
            url, data={"contributor_name": user.username}, format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json() == {
            "contributor_name": user.username,
            "full_name": user.profile.name,
            "email": user.email,
        }


def test_add_contributor_email(client, public_channel, staff_api, reddit_factories):
    """
    Adds a contributor to a channel by email
    """
    moderator = reddit_factories.user("mod_user1", is_staff=True)
    new_contributor = reddit_factories.user("new_mod_user")
    staff_api.add_moderator(moderator.username, public_channel.name)
    client.force_login(moderator)

    url = reverse("contributor-list", kwargs={"channel_name": public_channel.name})
    resp = client.post(url, data={"email": new_contributor.email}, format="json")

    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        "contributor_name": new_contributor.username,
        "email": new_contributor.email,
        "full_name": new_contributor.profile.name,
    }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_add_contributor_anonymous(client, settings, allow_anonymous):
    """
    Anonymous users can't add contributors to a channel
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse("contributor-list", kwargs={"channel_name": "admin_channel"})
    resp = client.post(url, data={"contributor_name": "some_username"}, format="json")
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


@pytest.mark.parametrize("attempts", [1, 2])
def test_remove_contributor(staff_client, private_channel_and_contributor, attempts):
    """
    Removes a contributor from a channel
    """
    channel, contributor = private_channel_and_contributor
    url = reverse(
        "contributor-detail",
        kwargs={"channel_name": channel.name, "contributor_name": contributor.username},
    )

    for _ in range(attempts):
        resp = staff_client.delete(url)
        assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_remove_contributor_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't remove contributors"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse(
        "contributor-detail",
        kwargs={"channel_name": "a_channel", "contributor_name": "a_contributor"},
    )
    resp = client.delete(url)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE
