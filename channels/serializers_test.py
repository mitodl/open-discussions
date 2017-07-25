"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import (
    Mock,
    patch,
)

import pytest
from rest_framework.exceptions import ValidationError

from channels.serializers import (
    ChannelSerializer,
    PostSerializer,
)


def test_serialize_channel(user):
    """
    Test serializing a channel
    """
    channel = Mock(
        display_name='name',
        title='title',
        subreddit_type='public',
        public_description='public_description',
    )
    request = Mock(user=user)
    assert ChannelSerializer(channel, context={
        "request": request,
    }).data == {
        'name': 'name',
        'title': 'title',
        'channel_type': 'public',
        'public_description': 'public_description',
    }


def test_create_channel(user):
    """
    Test creating a channel
    """
    validated_data = {
        'display_name': 'name',
        'title': 'title',
        'subreddit_type': 'public',
        'public_description': 'public_description',
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
        public_description=validated_data['public_description'],
    )
    assert channel == api.return_value.create_channel.return_value
    api.assert_called_once_with(user=user)


@pytest.mark.parametrize("is_empty", [True, False])
def test_update_channel(user, is_empty):
    """
    Test updating a channel
    """
    validated_data = {} if is_empty else {
        'title': 'title',
        'subreddit_type': 'public',
        'public_description': 'public_description',
    }
    display_name = 'subreddit'
    instance = Mock(display_name=display_name)
    request = Mock(user=user)
    with patch('channels.serializers.Api', autospec=True) as api:
        channel = ChannelSerializer(context={
            "request": request,
        }).update(instance, validated_data)

    kwargs = {} if is_empty else {
        "title": validated_data['title'],
        "channel_type": validated_data['subreddit_type'],
        "public_description": validated_data['public_description'],
    }
    api.return_value.update_channel.assert_called_once_with(
        name=display_name,
        **kwargs
    )
    assert channel == api.return_value.update_channel.return_value
    api.assert_called_once_with(user=user)


def test_post_validate_upvoted():
    """upvoted must be a bool"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_upvoted("not a bool")
    assert ex.value.args[0] == 'upvoted must be a bool'


def test_post_validate_text():
    """text must be a string"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_text(["not a string"])
    assert ex.value.args[0] == 'text must be a string'


def test_post_validate_url():
    """url must be a string"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_url(["not a string"])
    assert ex.value.args[0] == 'url must be a string'


def test_post_both_text_and_url():
    """We can't create a post with both text and url specified"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().create({
            'title': 'title',
            'text': 'text',
            'url': 'url',
        })
    assert ex.value.args[0] == 'Only one of text or url can be used to create a post'


def test_post_neither_text_nor_url():
    """One of text or url must be specified"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().create({
            "title": "title",
        })
    assert ex.value.args[0] == 'One of text or url must be provided to create a post'


def test_post_edit_url():
    """Cannot update the URL for a post"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer(context={
            "request": Mock(),
            "view": Mock(kwargs={'post_id': 'post'}),
        }).update(Mock(), {
            "url": "url"
        })
    assert ex.value.args[0] == 'Cannot edit url for a post'
