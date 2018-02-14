"""Tests for notification apis"""
from notifications.models import (
    NotificationSettings,
    NOTIFICATION_TYPE_FRONTPAGE,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications import api


def test_ensure_notification_settings(user):
    """Assert that notification settings are created"""
    assert NotificationSettings.objects.filter(user=user).count() == 0
    api.ensure_notification_settings(user)
    assert NotificationSettings.objects.filter(user=user).count() == 1
    ns = NotificationSettings.objects.get(user=user, notification_type=NOTIFICATION_TYPE_FRONTPAGE)
    assert ns.via_app is False
    assert ns.via_email is True
    assert ns.trigger_frequency == FREQUENCY_DAILY


def test_ensure_notification_settings_existing(user):
    """Assert that existing notification settings are left alone"""
    settings_for_user = NotificationSettings.objects.filter(user=user)
    assert settings_for_user.count() == 0
    api.ensure_notification_settings(user)
    settings = list(settings_for_user)
    assert settings_for_user.count() == 1
    frontpage_setting = settings[0]
    frontpage_setting.trigger_frequency = FREQUENCY_WEEKLY
    frontpage_setting.save()
    api.ensure_notification_settings(user)
    assert frontpage_setting.trigger_frequency == settings_for_user.first().trigger_frequency
