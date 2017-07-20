"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import (
    Mock,
    patch,
)

from channels.serializers import ChannelSerializer


def test_serialize_channel(user):
    """
    Test serializing a channel
    """
    channel = Mock(
        display_name='name',
        title='title',
        subreddit_type='public',
    )
    request = Mock(user=user)
    assert ChannelSerializer(channel, context={
        "request": request,
    }).data == {
        'name': 'name',
        'title': 'title',
        'channel_type': 'public',
    }


def test_create_channel(user):
    """
    Test creating a channel
    """
    validated_data = {
        'display_name': 'name',
        'title': 'title',
        'subreddit_type': 'public',
    }
    request = Mock(user=user)
    with patch('channels.serializers.Api', autospec=True) as api:
        channel = ChannelSerializer(context={
            "request": request,
        }).create(validated_data)
    api.return_value.create_channel.assert_called_once_with(
        name=validated_data['display_name'],
        title=validated_data['title'],
        channel_type=validated_data['subreddit_type'],
    )
    assert channel == api.return_value.create_channel.return_value
    api.assert_called_once_with(user=user)


def test_update_channel(user):
    """
    Test updating a channel
    """
    validated_data = {
        'title': 'title',
        'subreddit_type': 'public',
    }
    display_name = 'subreddit'
    instance = Mock(display_name=display_name)
    request = Mock(user=user)
    with patch('channels.serializers.Api', autospec=True) as api:
        channel = ChannelSerializer(context={
            "request": request,
        }).update(instance, validated_data)
    api.return_value.update_channel.assert_called_once_with(
        name=display_name,
        title=validated_data['title'],
        channel_type=validated_data['subreddit_type'],
    )
    assert channel == api.return_value.update_channel.return_value
    api.assert_called_once_with(user=user)
