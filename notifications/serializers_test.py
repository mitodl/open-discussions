"""Tests for notification serializers"""
from channels.factories.models import ChannelFactory
from notifications.serializers import NotificationSettingsSerializer
from notifications.factories import NotificationSettingsFactory


def test_notification_settings_serializer(user):
    """Tests that the correct fields are serialized"""
    settings = NotificationSettingsFactory.create(user=user)
    assert NotificationSettingsSerializer(settings).data == {
        "trigger_frequency": settings.trigger_frequency,
        "notification_type": settings.notification_type,
        "channel_name": None,
        "channel_title": None,
    }


def test_notification_settings_serializer_with_channel(user):
    """Tests that the correct fields are serialized"""
    channel = ChannelFactory.create()
    settings = NotificationSettingsFactory.create(user=user, channel=channel)
    assert NotificationSettingsSerializer(settings).data == {
        "trigger_frequency": settings.trigger_frequency,
        "notification_type": settings.notification_type,
        "channel_name": channel.name,
        "channel_title": channel.title,
    }
