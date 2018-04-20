"""Notifications API"""
import logging

from django.db.models import Q

from channels.models import Subscription
from notifications.notifiers.exceptions import UnsupportedNotificationTypeError
from notifications.models import (
    EmailNotification,
    NotificationSettings,
    NOTIFICATION_TYPE_FRONTPAGE,
    NOTIFICATION_TYPE_COMMENTS,
    FREQUENCY_IMMEDIATE,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications.notifiers import comments, frontpage
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

    if NOTIFICATION_TYPE_COMMENTS not in existing_notification_types:
        NotificationSettings.objects.get_or_create(
            user=user,
            notification_type=NOTIFICATION_TYPE_COMMENTS,
            defaults={
                'trigger_frequency': FREQUENCY_IMMEDIATE,
            }
        )


def _send_frontpage_digests(notification_settings):
    """
    Sends email notifications via the specified settings

    Args:
        notification_settings (QuerySet of NotificationSettings): a QuerySet for the settings to send
    """
    for notification_setting in notification_settings.iterator():
        notifier = frontpage.FrontpageDigestNotifier(notification_setting)
        notifier.attempt_notify()


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
    notification_settings = NotificationSettings.objects.get(
        user=notification.user,
        notification_type=notification.notification_type,
    )

    if notification.notification_type == NOTIFICATION_TYPE_FRONTPAGE:
        return frontpage.FrontpageDigestNotifier(notification_settings)
    elif notification.notification_type == NOTIFICATION_TYPE_COMMENTS:
        return comments.CommentNotifier(notification_settings)
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


def send_comment_notifications(post_id, comment_id, new_comment_id):
    """
    Sends notifications for a reply to a given post notification

    Args:
        post_id (str): base36 post id
        comment_id (str): base36 comment id
        new_comment_id (str): base36 comment id of the new comment
    """
    for subscription in Subscription.objects.filter(post_id=post_id).filter(
            Q(comment_id=comment_id) | Q(comment_id=None)
    ).distinct('user').iterator():
        try:
            notification_settings = NotificationSettings.objects.get(
                user_id=subscription.user_id,
                notification_type=NOTIFICATION_TYPE_COMMENTS,
            )
        except NotificationSettings.DoesNotExist:
            log.exception("NotificationSettings didn't exist for subscription %s", subscription.id)
            continue

        notifier = comments.CommentNotifier(notification_settings)
        notifier.create_comment_event(subscription, new_comment_id)
