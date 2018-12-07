"""Tests for views for REST APIs for channels"""
# pylint: disable=unused-argument,too-many-arguments
import os.path

import pytest
from django.urls import reverse
from rest_framework import status

from channels.constants import LINK_TYPE_ANY
from channels.factories import STRATEGY_BUILD
from channels.models import Channel
from open_discussions.constants import (
    NOT_AUTHENTICATED_ERROR_TYPE,
    PERMISSION_DENIED_ERROR_TYPE,
)
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = [pytest.mark.betamax, pytest.mark.usefixtures("mock_channel_exists")]


def test_list_channels(user_client, private_channel_and_contributor, request):
    """
    List channels the user is subscribed to
    """
    channel, _ = private_channel_and_contributor
    url = reverse("channel-list")
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "title": channel.title,
            "name": channel.name,
            "description": channel.description,
            "public_description": channel.public_description,
            "channel_type": channel.channel_type,
            "user_is_contributor": True,
            "user_is_moderator": False,
            "link_type": channel.link_type,
            "membership_is_managed": False,
            "avatar": None,
            "avatar_small": None,
            "avatar_medium": None,
            "banner": None,
            "ga_tracking_id": None,
            "widget_list_id": Channel.objects.get(name=channel.name).widget_list_id,
        }
    ]


def test_list_channels_ordered(user_client, subscribed_channels, request):
    """
    Channels should be in alphabetical order by title
    """
    url = reverse("channel-list")
    channel_list = user_client.get(url).json()
    for i in range(len(subscribed_channels) - 1):
        assert channel_list[i]["title"].lower() < channel_list[i + 1]["title"].lower()


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_list_channels_anonymous(client, settings, allow_anonymous):
    """
    List anonymous channels
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse("channel-list")
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        # Until we decide otherwise this should always be an empty list.
        assert resp.json() == []
    else:
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )
        assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


@pytest.mark.parametrize("managed", [True, False, None])
def test_create_channel(
    index_user, staff_client, staff_user, reddit_factories, managed, settings
):
    """
    Create a channel and assert the response
    """
    settings.INDEXING_API_USERNAME = index_user.username
    url = reverse("channel-list")
    channel = reddit_factories.channel(
        "private", user=staff_user, strategy=STRATEGY_BUILD
    )
    payload = {
        "channel_type": channel.channel_type,
        "name": channel.name,
        "title": channel.title,
        "description": channel.description,
        "public_description": channel.public_description,
        "link_type": channel.link_type,
    }
    if managed is not None:
        payload["membership_is_managed"] = managed
    resp = staff_client.post(url, data=payload)
    expected = {
        **payload,
        "user_is_contributor": True,
        "user_is_moderator": True,
        "membership_is_managed": managed is not False,
        "avatar": None,
        "avatar_small": None,
        "avatar_medium": None,
        "banner": None,
        "ga_tracking_id": None,
        "widget_list_id": Channel.objects.get(name=channel.name).widget_list_id,
    }
    assert resp.json() == expected
    assert resp.status_code == status.HTTP_201_CREATED


def test_create_channel_no_descriptions(
    index_user, staff_client, staff_user, reddit_factories, settings
):
    """
    Create a channel and assert the response for no descriptions
    """
    settings.INDEXING_API_USERNAME = index_user.username
    url = reverse("channel-list")
    channel = reddit_factories.channel(
        "private", user=staff_user, strategy=STRATEGY_BUILD
    )
    payload = {
        "channel_type": channel.channel_type,
        "link_type": "any",
        "name": channel.name,
        "title": channel.title,
    }
    resp = staff_client.post(url, data=payload)
    expected = {
        **payload,
        "description": "",
        "public_description": "",
        "user_is_contributor": True,
        "user_is_moderator": True,
        "membership_is_managed": True,
        "avatar": None,
        "avatar_small": None,
        "avatar_medium": None,
        "banner": None,
        "ga_tracking_id": None,
        "widget_list_id": Channel.objects.get(name=channel.name).widget_list_id,
    }
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == expected


def test_create_channel_already_exists(
    index_user, staff_client, private_channel, settings
):
    """
    Create a channel which already exists
    """
    settings.INDEXING_API_USERNAME = index_user.username
    url = reverse("channel-list")
    payload = {
        "channel_type": "private",
        "name": private_channel.name,
        "title": "Channel title",
        "description": "a description of the channel",
        "public_description": "public",
        "link_type": private_channel.link_type,
    }
    resp = staff_client.post(url, data=payload)
    assert resp.status_code == status.HTTP_409_CONFLICT


def test_create_channel_nonstaff(user_client):
    """
    Try to create a channel with nonstaff auth and assert a failure
    """
    url = reverse("channel-list")
    payload = {
        "channel_type": "private",
        "name": "a_channel",
        "title": "Channel title",
        "description": "a description of the channel",
        "public_description": "public",
        "link_type": LINK_TYPE_ANY,
    }
    resp = user_client.post(url, data=payload)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data == {
        "error_type": PERMISSION_DENIED_ERROR_TYPE,
        "detail": "You do not have permission to perform this action.",
    }


def test_create_channel_noauth(client):
    """
    Try to create a channel with no auth and assert a failure
    """
    url = reverse("channel-list")
    payload = {
        "channel_type": "private",
        "name": "a_channel",
        "title": "Channel title",
        "description": "a description of the channel",
        "public_description": "public",
    }
    resp = client.post(url, data=payload)
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_get_channel(user_client, private_channel_and_contributor):
    """
    Get a channel
    """
    channel, _ = private_channel_and_contributor
    url = reverse("channel-detail", kwargs={"channel_name": channel.name})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "channel_type": channel.channel_type,
        "name": channel.name,
        "title": channel.title,
        "description": channel.description,
        "public_description": channel.public_description,
        "user_is_contributor": True,
        "user_is_moderator": False,
        "link_type": channel.link_type,
        "membership_is_managed": False,
        "avatar": None,
        "avatar_small": None,
        "avatar_medium": None,
        "banner": None,
        "ga_tracking_id": None,
        "widget_list_id": Channel.objects.get(name=channel.name).widget_list_id,
    }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_get_channel_anonymous(client, public_channel, settings, allow_anonymous):
    """
    An anonymous user should be able to see a public channel
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse("channel-detail", kwargs={"channel_name": public_channel.name})
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            "channel_type": public_channel.channel_type,
            "name": public_channel.name,
            "title": public_channel.title,
            "description": public_channel.description,
            "public_description": public_channel.public_description,
            "user_is_contributor": False,
            "user_is_moderator": False,
            "link_type": public_channel.link_type,
            "membership_is_managed": False,
            "avatar": None,
            "avatar_small": None,
            "avatar_medium": None,
            "banner": None,
            "ga_tracking_id": None,
            "widget_list_id": Channel.objects.get(
                name=public_channel.name
            ).widget_list_id,
        }
    else:
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )
        assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE


def test_get_short_channel(user_client):
    """
    test getting a one-character channel name
    """
    Channel.objects.create(name="a")
    url = reverse("channel-detail", kwargs={"channel_name": "a"})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_channel_forbidden(user_client):
    """
    If PRAW returns a 403 error we should also return a 403 error
    """
    Channel.objects.create(name="xavier2")
    url = reverse("channel-detail", kwargs={"channel_name": "xavier2"})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_channel_not_found(user_client):
    """
    If PRAW returns a 404 error we should also return a 404 error
    """
    Channel.objects.create(name="not_a_real_channel_name")
    url = reverse("channel-detail", kwargs={"channel_name": "not_a_real_channel_name"})
    resp = user_client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_channel_with_avatar_banner(staff_client, public_channel):
    """
    If a channel has an image we should show its URL
    """
    channel = Channel.objects.get(name=public_channel.name)
    channel.avatar = "avatar"
    channel.avatar_small = "avatar_small"
    channel.avatar_medium = "avatar_medium"
    channel.banner = "banner"
    channel.save()

    url = reverse("channel-detail", kwargs={"channel_name": public_channel.name})
    resp = staff_client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["avatar"] == "/media/avatar"
    assert resp.json()["avatar_small"] == "/media/avatar_small"
    assert resp.json()["avatar_medium"] == "/media/avatar_medium"
    assert resp.json()["banner"] == "/media/banner"


def test_patch_channel(staff_client, private_channel):
    """
    Update a channel's settings
    """
    url = reverse("channel-detail", kwargs={"channel_name": private_channel.name})
    resp = staff_client.patch(url, {"channel_type": "public"}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "channel_type": "public",
        "link_type": private_channel.link_type,
        "name": private_channel.name,
        "title": private_channel.title,
        "description": private_channel.description,
        "public_description": private_channel.public_description,
        "user_is_contributor": True,
        "user_is_moderator": True,
        "membership_is_managed": False,
        "avatar": None,
        "avatar_small": None,
        "avatar_medium": None,
        "banner": None,
        "ga_tracking_id": None,
        "widget_list_id": Channel.objects.get(name=private_channel.name).widget_list_id,
    }
    assert Channel.objects.count() == 1
    channel_obj = Channel.objects.first()
    assert channel_obj.name == private_channel.name
    assert channel_obj.membership_is_managed is False


def test_patch_channel_moderator(
    user_client, staff_api, private_channel_and_contributor
):
    """
    Update a channel's settings with a moderator user
    """
    private_channel, user = private_channel_and_contributor
    url = reverse("channel-detail", kwargs={"channel_name": private_channel.name})
    staff_api.add_moderator(user.username, private_channel.name)
    resp = user_client.patch(url, {"channel_type": "public"}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "channel_type": "public",
        "name": private_channel.name,
        "title": private_channel.title,
        "description": private_channel.description,
        "public_description": private_channel.public_description,
        "user_is_contributor": True,
        "user_is_moderator": True,
        "link_type": private_channel.link_type,
        "membership_is_managed": False,
        "avatar": None,
        "avatar_small": None,
        "avatar_medium": None,
        "banner": None,
        "ga_tracking_id": None,
        "widget_list_id": Channel.objects.get(name=private_channel.name).widget_list_id,
    }


@pytest.mark.parametrize("field", ["avatar", "banner"])
def test_patch_channel_image(staff_client, public_channel, field):
    """
    Update a channel's image
    """
    url = reverse("channel-detail", kwargs={"channel_name": public_channel.name})
    png_file = os.path.join(
        os.path.dirname(__file__), "..", "..", "static", "images", "blank.png"
    )
    with open(png_file, "rb") as f:
        resp = staff_client.patch(url, {field: f}, format="multipart")
    assert resp.status_code == status.HTTP_200_OK
    channel = Channel.objects.get(name=public_channel.name)
    image = getattr(channel, field)

    assert f"{public_channel.name}/channel_{field}_" in image.name
    assert len(image.read()) == os.path.getsize(png_file)

    if field == "avatar":
        for size_field in ("avatar_small", "avatar_medium"):
            size_image = getattr(channel, size_field)
            assert f"_{size_field}" in size_image.name
            assert len(size_image.read()) > 0


@pytest.mark.parametrize("field", ["avatar", "banner"])
def test_patch_channel_validate_image(staff_client, private_channel, field):
    """
    It should error if the avatar or banner patch object is not a file
    """
    url = reverse("channel-detail", kwargs={"channel_name": private_channel.name})
    resp = staff_client.patch(url, {field: b"test"}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json() == {
        "error_type": "ValidationError",
        field: [f"Expected {field} to be a file"],
    }


def test_patch_channel_forbidden(staff_client):
    """
    Update a channel's settings for a channel the user doesn't have permission to
    """
    Channel.objects.create(name="dedp2")
    url = reverse("channel-detail", kwargs={"channel_name": "dedp2"})
    resp = staff_client.patch(url, {"channel_type": "public"}, format="json")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("request_method", ["patch", "put"])
def test_update_title_non_superuser_forbidden(
    settings, index_user, staff_client, staff_user, reddit_factories, request_method
):
    """
    Create a channel and assert the response for no descriptions
    """
    staff_user.is_superuser = False
    staff_user.save()

    # NOTE: Creating a channel in this way because I couldn't find a fixture or a
    # straightforward way to prepare channel data for a PUT request
    settings.INDEXING_API_USERNAME = index_user.username
    url = reverse("channel-list")
    channel = reddit_factories.channel(
        "private", user=staff_user, strategy=STRATEGY_BUILD
    )
    payload = {
        "channel_type": channel.channel_type,
        "link_type": "any",
        "name": channel.name,
        "title": channel.title,
    }
    staff_client.post(url, data=payload)

    url = reverse("channel-detail", kwargs={"channel_name": channel.name})
    request_func = getattr(staff_client, request_method)
    serialized_channel_unchanged_title = dict(payload)
    if request_method == "patch":
        del serialized_channel_unchanged_title["title"]
    resp = request_func(url, serialized_channel_unchanged_title)
    assert resp.status_code == status.HTTP_200_OK
    payload["title"] = "{} [updated]".format(payload["title"])
    resp = request_func(url, payload)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_patch_channel_not_found(staff_client):
    """
    Update a channel's settings for a missing channel
    """
    Channel.objects.create(name="missing")
    url = reverse("channel-detail", kwargs={"channel_name": "missing"})
    resp = staff_client.patch(url, {"channel_type": "public"}, format="json")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_patch_channel_nonstaff(user_client):
    """
    Fail to update a channel's settings if nonstaff user
    """
    Channel.objects.create(name="subreddit_for_testing")
    url = reverse("channel-detail", kwargs={"channel_name": "subreddit_for_testing"})
    resp = user_client.patch(url, {"channel_type": "public"}, format="json")
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data == {
        "error_type": PERMISSION_DENIED_ERROR_TYPE,
        "detail": "You do not have permission to perform this action.",
    }


def test_patch_channel_noauth(client):
    """
    Fail to update a channel's settings if no auth
    """
    url = reverse("channel-detail", kwargs={"channel_name": "subreddit_for_testing"})
    resp = client.patch(url, {"channel_type": "public"}, format="json")
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data["error_type"] == NOT_AUTHENTICATED_ERROR_TYPE
