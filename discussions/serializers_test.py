"""Discussions serializer tests"""
import pytest

from discussions.factories import ChannelFactory
from discussions.models import Channel
from discussions.serializers import ChannelSerializer, CreateChannelSerializer

pytestmark = pytest.mark.django_db


def test_create_channel_serializer(mocker):
    """Verify the CreateChannelSerializer creates a channel"""
    mock_set_channel_permissions = mocker.patch(
        "discussions.api.channels.set_channel_permissions", autospec=True
    )
    channel = ChannelFactory.build()
    serializer = CreateChannelSerializer(
        data={
            "name": channel.name,
            "title": channel.title,
            "channel_type": channel.channel_type,
        }
    )

    assert Channel.objects.count() == 0
    assert serializer.is_valid(), f"Errors: {serializer.errors}"

    channel = serializer.save()
    assert Channel.objects.count() == 1

    mock_set_channel_permissions.assert_called_once_with(channel)

    assert channel.moderator_group is not None
    assert channel.moderator_group.user_set.count() == 0
    assert channel.contributor_group is not None
    assert channel.contributor_group.user_set.count() == 0


def test_save_channel_serializer(mocker):
    """Verify the ChannelSerializer updates a channel"""
    mock_set_channel_permissions = mocker.patch(
        "discussions.api.channels.set_channel_permissions", autospec=True
    )
    title = "updated title"

    channel = ChannelFactory.create()
    serializer = ChannelSerializer(
        instance=channel, data={"title": title}, partial=True
    )

    assert serializer.is_valid(), f"Errors: {serializer.errors}"

    channel = serializer.save()

    mock_set_channel_permissions.assert_called_once_with(channel)

    assert channel.title == title
    assert channel.moderator_group is not None
    assert channel.moderator_group.user_set.count() == 0
    assert channel.contributor_group is not None
    assert channel.contributor_group.user_set.count() == 0
