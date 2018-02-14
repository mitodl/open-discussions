"""Notification serializers"""
from rest_framework import serializers

from notifications.models import NotificationSettings


class NotificationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for NotificationSettings"""
    class Meta:
        model = NotificationSettings
        fields = ('notification_type', 'trigger_frequency')
        read_only_fields = ('notification_type',)
