"""Tests for views"""
# pylint: disable=redefined-outer-name
import pytest
from django.urls import reverse
from rest_framework import status

from discussions.factories import ChannelFactory
from discussions.serializers import ChannelSerializer

pytestmark = pytest.mark.django_db


@pytest.fixture
def public_channel():
    """A fixture to create a public channel"""
    return ChannelFactory.create(is_public=True)


@pytest.fixture
def restricted_channel():
    """A fixture to create a restricted channel"""
    return ChannelFactory.create(is_restricted=True)


@pytest.fixture
def private_channel():
    """A fixture to create a private channel"""
    return ChannelFactory.create(is_private=True)


@pytest.fixture
def channels(request):
    """A fixture that returns the specified channel fixture values"""
    return sorted(
        [request.getfixturevalue(fixture_name) for fixture_name in request.param],
        key=lambda c: c.id,
    )


@pytest.fixture
def contributor_user(user, private_channel):
    """A fixture to define a user who is a contributor of the private channel"""
    user.groups.add(private_channel.contributor_group)
    return user


@pytest.mark.usefixtures("public_channel", "restricted_channel", "private_channel")
@pytest.mark.parametrize(
    "auth_user, channels",
    (
        pytest.param(
            pytest.lazy_fixture("admin_user"),
            ["public_channel", "restricted_channel", "private_channel"],
            id="admin_user",
        ),
        pytest.param(
            pytest.lazy_fixture("contributor_user"),
            ["public_channel", "restricted_channel", "private_channel"],
            id="contributor",
        ),
        pytest.param(
            pytest.lazy_fixture("user"),
            ["public_channel", "restricted_channel"],
            id="noncontributor",
        ),
        pytest.param(None, ["public_channel", "restricted_channel"], id="anonymous"),
    ),
    indirect=["channels"],
)
def test_channels_list(client, auth_user, channels):
    """Test the channel listing API"""
    if auth_user:
        client.force_login(auth_user)
    response = client.get(reverse("channel_api_v1-list"))

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["results"] == [
        ChannelSerializer(channel).data for channel in channels
    ]
