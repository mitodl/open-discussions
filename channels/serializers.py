"""
Serializers for channel REST APIs
"""
from praw.exceptions import APIException
from rest_framework import serializers
from rest_framework.validators import ValidationError

from channels.api import (
    Api,
    VALID_CHANNEL_TYPES,
)


class ChannelSerializer(serializers.Serializer):
    """Serializer for channels"""

    title = serializers.CharField()
    name = serializers.CharField(source='display_name')
    channel_type = serializers.ChoiceField(
        source="subreddit_type",
        choices=VALID_CHANNEL_TYPES,
    )

    def create(self, validated_data):
        api = Api()
        api.user = True
        try:
            return api.create_channel(
                name=validated_data['display_name'],
                title=validated_data['title'],
                channel_type=validated_data['subreddit_type'],
            )
        except (ValueError, APIException) as ex:
            # Note: When this is not a proof of concept we should be careful about leaking information about reddit
            raise ValidationError("{}".format(ex)) from ex

    def update(self, instance, validated_data):
        api = Api()
        api.user = True
        try:
            api.update_channel(
                name=validated_data['display_name'],
                title=validated_data['title'],
                channel_type=validated_data['subreddit_type'],
            )
        except APIException as ex:
            raise ValidationError("{}".format(ex)) from ex


class PostSerializer(serializers.Serializer):
    """Serializer for posts"""
