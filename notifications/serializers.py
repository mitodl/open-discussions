"""Notification serializers"""
from rest_framework import serializers

from notifications.models import NotificationSettings


class NotificationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for NotificationSettings"""

    channel_name = serializers.SerializerMethodField()
    channel_title = serializers.SerializerMethodField()

    def get_channel_name(self, instance):
        """Get the channel name"""
        if instance.channel:
            return instance.channel.name
        return None

    def get_channel_title(self, instance):
        """Get the channel title"""
        if instance.channel:
            return instance.channel.title
        return None

    class Meta:
        model = NotificationSettings
        fields = (
            "notification_type",
            "trigger_frequency",
            "channel_name",
            "channel_title",
        )
        read_only_fields = ("notification_type", "channel_name", "channel_title")
