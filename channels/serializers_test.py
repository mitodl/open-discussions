"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import (
    Mock,
    patch,
)

from channels.serializers import ChannelSerializer


def test_serialize_channel():
    """
    Test serializing a channel
    """
    channel = Mock(
        display_name='name',
        title='title',
        subreddit_type='public',
    )
    assert ChannelSerializer(channel).data == {
        'name': 'name',
        'title': 'title',
        'channel_type': 'public',
    }


def test_create_channel():
    """
    Test creating a channel
    """
    validated_data = {
        'display_name': 'name',
        'title': 'title',
        'subreddit_type': 'public',
    }
    with patch('channels.serializers.Api', autospec=True) as api:
        channel = ChannelSerializer().create(validated_data)
    api.return_value.create_channel.assert_called_once_with(
        name=validated_data['display_name'],
        title=validated_data['title'],
        channel_type=validated_data['subreddit_type'],
    )
    assert channel == api.return_value.create_channel.return_value


def test_update_channel():
    """
    Test updating a channel
    """
    validated_data = {
        'display_name': 'name',
        'title': 'title',
        'subreddit_type': 'public',
    }
    with patch('channels.serializers.Api', autospec=True) as api:
        channel = ChannelSerializer().update(None, validated_data)
    api.return_value.update_channel.assert_called_once_with(
        name=validated_data['display_name'],
        title=validated_data['title'],
        channel_type=validated_data['subreddit_type'],
    )
    assert channel == api.return_value.update_channel.return_value
