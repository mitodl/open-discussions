"""
Serializers for channel REST APIs
"""
from rest_framework import serializers

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
        return api.create_channel(
            name=validated_data['display_name'],
            title=validated_data['title'],
            channel_type=validated_data['subreddit_type'],
        )

    def update(self, instance, validated_data):
        api = Api()
        api.user = True

        name = instance.display_name
        key_map = {
            'title': 'title',
            'channel_type': 'subreddit_type',
        }
        kwargs = {}
        for rest_key, reddit_key in key_map.items():
            if rest_key in validated_data:
                kwargs[reddit_key] = validated_data[rest_key]

        return api.update_channel(name=name, **kwargs)
