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
    public_description = serializers.CharField()
    channel_type = serializers.ChoiceField(
        source="subreddit_type",
        choices=VALID_CHANNEL_TYPES,
    )

    def create(self, validated_data):
        api = Api(user=self.context['request'].user)
        return api.create_channel(
            name=validated_data['display_name'],
            title=validated_data['title'],
            channel_type=validated_data['subreddit_type'],
            public_description=validated_data['public_description'],
        )

    def update(self, instance, validated_data):
        api = Api(user=self.context['request'].user)
        name = instance.display_name
        kwargs = {}
        if 'title' in validated_data:
            kwargs['title'] = validated_data['title']
        if 'subreddit_type' in validated_data:
            kwargs['channel_type'] = validated_data['subreddit_type']
        if 'public_description' in validated_data:
            kwargs['public_description'] = validated_data['public_description']

        return api.update_channel(name=name, **kwargs)
