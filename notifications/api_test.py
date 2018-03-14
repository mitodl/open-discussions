"""Tests for notification apis"""
import pytest

from notifications.factories import (
    EmailNotificationFactory,
    NotificationSettingsFactory,
)
from notifications.models import (
    NotificationSettings,
    EmailNotification,
    NOTIFICATION_TYPE_FRONTPAGE,
    NOTIFICATION_TYPE_COMMENTS,
    FREQUENCY_NEVER,
    FREQUENCY_IMMEDIATE,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications import api

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('email_optin', [None, True, False])
def test_ensure_notification_settings(user, email_optin):
    """Assert that notification settings are created"""
    profile = user.profile
    profile.email_optin = email_optin
    profile.save()
    assert NotificationSettings.objects.filter(user=user).count() == 0
    api.ensure_notification_settings(user)
    assert NotificationSettings.objects.filter(user=user).count() == 2
    ns = NotificationSettings.objects.get(user=user, notification_type=NOTIFICATION_TYPE_FRONTPAGE)
    assert ns.via_app is False
    assert ns.via_email is True
    assert ns.trigger_frequency == FREQUENCY_DAILY if email_optin else FREQUENCY_NEVER

    ns = NotificationSettings.objects.get(user=user, notification_type=NOTIFICATION_TYPE_COMMENTS)
    assert ns.via_app is False
    assert ns.via_email is True
    assert ns.trigger_frequency == FREQUENCY_IMMEDIATE if email_optin else FREQUENCY_NEVER


def test_ensure_notification_settings_existing(user):
    """Assert that existing notification settings are left alone"""
    settings_for_user = NotificationSettings.objects.filter(user=user)
    assert settings_for_user.count() == 0
    api.ensure_notification_settings(user)
    settings = list(settings_for_user)
    assert settings_for_user.count() == 2
    frontpage_setting = settings[0]
    frontpage_setting.trigger_frequency = FREQUENCY_WEEKLY
    frontpage_setting.save()
    comments_settings = settings[1]
    comments_settings.trigger_frequency = FREQUENCY_NEVER
    comments_settings.save()
    api.ensure_notification_settings(user)
    assert frontpage_setting.trigger_frequency == settings_for_user[0].trigger_frequency
    assert comments_settings.trigger_frequency == settings_for_user[1].trigger_frequency


def test_send_daily_frontpage_digests(mocker):
    """Tests that send_daily_frontpage_digests only triggers for daily settings"""
    notification_settings = NotificationSettingsFactory.create_batch(50, daily=True, frontpage_type=True)
    NotificationSettingsFactory.create_batch(50, weekly=True, frontpage_type=True)

    mock_notifier = mocker.patch('notifications.notifiers.frontpage.FrontpageDigestNotifier').return_value

    api.send_daily_frontpage_digests()

    assert mock_notifier.attempt_notify.call_count == len(notification_settings)
    for setting in notification_settings:
        mock_notifier.attempt_notify.assert_any_call(setting)


def test_send_weekly_frontpage_digests(mocker):
    """Tests that send_weekly_frontpage_digests only triggers for weekly settings"""
    notification_settings = NotificationSettingsFactory.create_batch(50, weekly=True, frontpage_type=True)
    NotificationSettingsFactory.create_batch(50, daily=True, frontpage_type=True)

    mock_notifier = mocker.patch('notifications.notifiers.frontpage.FrontpageDigestNotifier').return_value

    api.send_weekly_frontpage_digests()

    assert mock_notifier.attempt_notify.call_count == len(notification_settings)
    for setting in notification_settings:
        mock_notifier.attempt_notify.assert_any_call(setting)


def test_send_unsent_email_notifications(mocker):
    """Tests that send_unsent_email_notifications triggers a task for each batch"""

    notifications_ids = sorted([note.id for note in EmailNotificationFactory.create_batch(150)])

    mock_task = mocker.patch('notifications.tasks.send_email_notification_batch').delay
    assert EmailNotification.objects.filter(state=EmailNotification.STATE_SENDING).count() == 0

    api.send_unsent_email_notifications()

    assert mock_task.call_count == 2
    mock_task.assert_any_call(notifications_ids[:100])
    mock_task.assert_any_call(notifications_ids[100:])
    assert EmailNotification.objects.filter(state=EmailNotification.STATE_SENDING).count() == len(notifications_ids)


def test_send_email_notification_batch(mocker):
    """Verify send_email_notification_batch calls the notifier for each of the notifications it is given"""
    # note: only frontpage is supported at the moment so we force that type
    notifications = EmailNotificationFactory.create_batch(50, frontpage_type=True)
    notifications_ids = [note.id for note in notifications]

    mock_notifier = mocker.patch('notifications.notifiers.frontpage.FrontpageDigestNotifier').return_value

    api.send_email_notification_batch(notifications_ids)

    assert mock_notifier.send_notification.call_count == len(notifications)
    for notification in notifications:
        mock_notifier.send_notification.assert_any_call(notification)
