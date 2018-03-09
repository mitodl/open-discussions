"""Notifications API"""
import logging

from notifications.notifiers.exceptions import UnsupportedNotificationTypeError
from notifications.models import (
    EmailNotification,
    NotificationSettings,
    NOTIFICATION_TYPE_FRONTPAGE,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications.notifiers import frontpage
from notifications import tasks
from open_discussions.utils import chunks

log = logging.getLogger()


def ensure_notification_settings(user):
    """
    Populates user with notification settings

    Args:
        user (User): user to create settings for
    """
    existing_notification_types = NotificationSettings.objects.filter(
        user=user
    ).values_list('notification_type', flat=True)

    if NOTIFICATION_TYPE_FRONTPAGE not in existing_notification_types:
        NotificationSettings.objects.get_or_create(
            user=user,
            notification_type=NOTIFICATION_TYPE_FRONTPAGE,
            defaults={
                'trigger_frequency': FREQUENCY_DAILY,
            }
        )


def _send_frontpage_digests(notification_settings):
    """
    Sends email notifications via the specified settings

    Args:
        notification_settings (QuerySet of NotificationSettings): a QuerySet for the settings to send
    """
    notifer = frontpage.FrontpageDigestNotifier()

    for notification_setting in notification_settings.iterator():
        notifer.attempt_notify(notification_setting)


def send_daily_frontpage_digests():
    """Sends daily frontpage digest emails"""
    notification_settings = NotificationSettings.frontpage_settings().filter(trigger_frequency=FREQUENCY_DAILY)

    _send_frontpage_digests(notification_settings)


def send_weekly_frontpage_digests():
    """Sends weekly frontpage digest emails"""
    notification_settings = NotificationSettings.frontpage_settings().filter(trigger_frequency=FREQUENCY_WEEKLY)

    _send_frontpage_digests(notification_settings)


def _get_notifier_for_notification(notification):
    """
    Get the notifier for the notification's type

    Args:
        notification (NotificationBase): the notification to get a notifier for

    Returns:
        Notifier: instance of the notifier to use
    """
    if notification.notification_type == NOTIFICATION_TYPE_FRONTPAGE:
        return frontpage.FrontpageDigestNotifier()
    else:
        raise UnsupportedNotificationTypeError(
            "Notification type '{}' is unsupported".format(notification.notification_type)
        )


def send_unsent_email_notifications():
    """
    Send all notifications that haven't been sent yet
    """
    for notification_ids in chunks(EmailNotification.objects.filter(
            state=EmailNotification.STATE_PENDING,
    ).values_list('id', flat=True), 100):
        EmailNotification.objects.filter(id__in=notification_ids).update(state=EmailNotification.STATE_SENDING)
        tasks.send_email_notification_batch.delay(notification_ids)


def send_email_notification_batch(notification_ids):
    """
    Sends a batch of notifications

    Args:
        notification_ids (list of int): notification ids to send
    """
    for notification in EmailNotification.objects.filter(id__in=notification_ids):
        try:
            notifier = _get_notifier_for_notification(notification)
            notifier.send_notification(notification)
        except:  # pylint: disable=bare-except
            log.exception('Error sending notification')
