"""Tests for notification serializers"""
from notifications.factories import NotificationSettingsFactory
from notifications.serializers import NotificationSettingsSerializer


def test_notification_settings_serializer(user):
    """Tests that the correct fields are serialized"""
    settings = NotificationSettingsFactory.create(user=user)
    assert NotificationSettingsSerializer(settings).data == {
        "trigger_frequency": settings.trigger_frequency,
        "notification_type": settings.notification_type,
    }
