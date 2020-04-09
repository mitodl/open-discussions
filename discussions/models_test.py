"""Tests for discussions models"""
import pytest
from django.contrib.auth.models import AnonymousUser

from discussions.constants import ChannelTypes
from discussions.factories import ChannelFactory
from discussions.models import Channel
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "channel_type",
    [
        pytest.param(ChannelTypes.PUBLIC, id="is_public"),
        pytest.param(ChannelTypes.RESTRICTED, id="is_restricted"),
        pytest.param(ChannelTypes.PRIVATE, id="is_private"),
    ],
)
def test_channel_channel_type(channel_type):
    """Test channel_type properties"""
    channel = ChannelFactory.create(channel_type=channel_type.value)

    assert channel.is_public is (channel_type == ChannelTypes.PUBLIC)
    assert channel.is_restricted is (channel_type == ChannelTypes.RESTRICTED)
    assert channel.is_private is (channel_type == ChannelTypes.PRIVATE)


def test_channel_contributor_group():
    """Test that the contributor group works correctly"""
    channel = ChannelFactory.create()

    assert channel.contributors.exists() is False

    contributor = UserFactory.create()
    contributor.groups.add(channel.contributor_group)

    assert list(channel.contributors) == [contributor]


def test_channel_moderator_group():
    """Test that the moderator group works correctly"""
    channel = ChannelFactory.create()

    assert channel.moderators.exists() is False

    moderator = UserFactory.create()
    moderator.groups.add(channel.moderator_group)

    assert list(channel.moderators) == [moderator]


@pytest.mark.parametrize(
    "channel_type, expected",
    [
        pytest.param(ChannelTypes.PUBLIC, True),
        pytest.param(ChannelTypes.RESTRICTED, True),
        pytest.param(ChannelTypes.PRIVATE, False),
    ],
)
def test_is_readable_by_any_user(channel_type, expected):
    """Test is_readable_by_any_user returns true for non-private channels"""
    channel = ChannelFactory.create(channel_type=channel_type.value)
    assert channel.is_readable_by_any_user is expected


@pytest.mark.parametrize(
    "is_anonymous, is_staff, is_contributor, is_moderator",
    [
        pytest.param(True, False, False, False, id="anonymous"),
        pytest.param(False, False, False, False, id="logged_in"),
        pytest.param(False, False, True, False, id="contributor"),
        pytest.param(False, False, False, True, id="moderator"),
        pytest.param(False, False, True, True, id="moderator_and_contributor"),
        pytest.param(False, True, True, False, id="staff"),
        pytest.param(False, True, True, True, id="staff_contributor"),
        pytest.param(False, True, False, True, id="staff_moderator"),
    ],
)
def test_channel_queryset_filter_for_user(
    is_anonymous, is_staff, is_contributor, is_moderator
):
    """Verify the filter_for_user method on the channel queryset works as expected"""
    user = AnonymousUser() if is_anonymous else UserFactory.create()
    public_channel = ChannelFactory.create(is_public=True)
    restricted_channel = ChannelFactory.create(is_restricted=True)
    private_channel = ChannelFactory.create(is_private=True)

    if is_moderator:
        user.groups.add(private_channel.moderator_group)
    if is_contributor:
        user.groups.add(private_channel.contributor_group)

    channels = list(Channel.objects.filter_for_user(user))

    if is_contributor or is_moderator or is_staff:
        assert channels == [public_channel, restricted_channel, private_channel]
    else:
        assert channels == [public_channel, restricted_channel]
