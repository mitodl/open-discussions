"""Tests for notification apis"""
import pytest

from channels.factories import SubscriptionFactory
from notifications.factories import (
    EmailNotificationFactory,
    NotificationSettingsFactory,
)
from notifications.models import (
    NotificationSettings,
    EmailNotification,
    CommentEvent,
    NOTIFICATION_TYPE_FRONTPAGE,
    NOTIFICATION_TYPE_COMMENTS,
    FREQUENCY_NEVER,
    FREQUENCY_IMMEDIATE,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications import api
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


def test_ensure_notification_settings(user):
    """Assert that notification settings are created"""
    assert NotificationSettings.objects.filter(user=user).count() == 0
    api.ensure_notification_settings(user)
    assert NotificationSettings.objects.filter(user=user).count() == 2
    ns = NotificationSettings.objects.get(user=user, notification_type=NOTIFICATION_TYPE_FRONTPAGE)
    assert ns.via_app is False
    assert ns.via_email is True
    assert ns.trigger_frequency == FREQUENCY_DAILY

    ns = NotificationSettings.objects.get(user=user, notification_type=NOTIFICATION_TYPE_COMMENTS)
    assert ns.via_app is False
    assert ns.via_email is True
    assert ns.trigger_frequency == FREQUENCY_IMMEDIATE


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

    mock_notifier_cls = mocker.patch('notifications.notifiers.frontpage.FrontpageDigestNotifier')

    api.send_daily_frontpage_digests()

    assert mock_notifier_cls.return_value.attempt_notify.call_count == len(notification_settings)
    for setting in notification_settings:
        mock_notifier_cls.assert_any_call(setting)
        mock_notifier_cls.return_value.attempt_notify.assert_any_call()


def test_send_weekly_frontpage_digests(mocker):
    """Tests that send_weekly_frontpage_digests only triggers for weekly settings"""
    notification_settings = NotificationSettingsFactory.create_batch(50, weekly=True, frontpage_type=True)
    NotificationSettingsFactory.create_batch(50, daily=True, frontpage_type=True)

    mock_notifier_cls = mocker.patch('notifications.notifiers.frontpage.FrontpageDigestNotifier')

    api.send_weekly_frontpage_digests()

    assert mock_notifier_cls.return_value.attempt_notify.call_count == len(notification_settings)
    for setting in notification_settings:
        mock_notifier_cls.assert_any_call(setting)
        mock_notifier_cls.return_value.attempt_notify.assert_any_call()


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
    frontpage_notifications = EmailNotificationFactory.create_batch(50, frontpage_type=True)
    comment_notifications = EmailNotificationFactory.create_batch(50, comments_type=True)
    notifications = comment_notifications + frontpage_notifications
    notifications_ids = [note.id for note in notifications]
    for notification in notifications:
        NotificationSettingsFactory.create(user=notification.user, notification_type=notification.notification_type)

    mock_frontpage_notifier = mocker.patch('notifications.notifiers.frontpage.FrontpageDigestNotifier').return_value
    mock_comment_notifier = mocker.patch('notifications.notifiers.comments.CommentNotifier').return_value

    api.send_email_notification_batch(notifications_ids)

    assert mock_comment_notifier.send_notification.call_count == len(comment_notifications)
    assert mock_frontpage_notifier.send_notification.call_count == len(frontpage_notifications)

    for notification in frontpage_notifications:
        mock_frontpage_notifier.send_notification.assert_any_call(notification)

    for notification in comment_notifications:
        mock_comment_notifier.send_notification.assert_any_call(notification)


@pytest.mark.parametrize('post_id,comment_id', [
    ('1', '4'),
    ('1', None)
])
def test_send_comment_notifications(post_id, comment_id):
    """Tests that send_comment_notifications works correctly"""
    comment_users = UserFactory.create_batch(5)
    for user in comment_users:
        NotificationSettingsFactory.create(user=user, comments_type=True)
        # create both so we cover the notifiication deduplication
        SubscriptionFactory.create(user=user, post_id=post_id, comment_id=comment_id)
        SubscriptionFactory.create(user=user, post_id=post_id, comment_id=None)

    post_users = UserFactory.create_batch(5)
    for user in post_users:
        NotificationSettingsFactory.create(user=user, comments_type=True)
        SubscriptionFactory.create(user=user, post_id=post_id, comment_id=None)

    # create just a subscription for a user so we can test no settings scenario
    SubscriptionFactory.create(post_id=post_id, comment_id=comment_id)

    # create a bunch on other subscriptions
    SubscriptionFactory.create_batch(10)

    api.send_comment_notifications(post_id, comment_id, 'abc')

    users = post_users + comment_users

    assert CommentEvent.objects.count() == len(users)
    for event in CommentEvent.objects.all():
        assert event.post_id == post_id
        assert event.comment_id == 'abc'
        assert event.user in users
