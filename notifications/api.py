"""Notifications API"""
import logging

from django.conf import settings

from notifications import tasks
from notifications.models import (
    FREQUENCY_IMMEDIATE,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
    NOTIFICATION_TYPE_COMMENTS,
    NOTIFICATION_TYPE_FRONTPAGE,
    NOTIFICATION_TYPE_MODERATOR,
    EmailNotification,
    NotificationSettings,
)
from notifications.notifiers import frontpage
from notifications.notifiers.exceptions import (
    CancelNotificationError,
    UnsupportedNotificationTypeError,
)
from open_discussions.utils import chunks

log = logging.getLogger()


def ensure_notification_settings(user, skip_moderator_setting=False):
    """Populates user with notification settings

    Args:
        user (User): user to create settings for
        skip_moderator_setting (boolean): Skip moderator notification creation (deprecated)

    """
    existing_notification_types = NotificationSettings.objects.filter(
        user=user
    ).values_list("notification_type", flat=True)

    if NOTIFICATION_TYPE_FRONTPAGE not in existing_notification_types:
        NotificationSettings.objects.get_or_create(
            user=user,
            notification_type=NOTIFICATION_TYPE_FRONTPAGE,
            defaults={"trigger_frequency": FREQUENCY_DAILY},
        )

    if NOTIFICATION_TYPE_COMMENTS not in existing_notification_types:
        NotificationSettings.objects.get_or_create(
            user=user,
            notification_type=NOTIFICATION_TYPE_COMMENTS,
            defaults={"trigger_frequency": FREQUENCY_IMMEDIATE},
        )


def attempt_send_notification_batch(notification_settings_ids):
    """Attempts to send notification for the given batch of ids

    Args:
        notification_settings_ids (list of int): list of NotificationSettings.ids

    """
    notification_settings = NotificationSettings.objects.filter(
        id__in=notification_settings_ids
    )
    for notification_setting in notification_settings:
        try:
            notifier = frontpage.FrontpageDigestNotifier(notification_setting)
            notifier.attempt_notify()
        except:  # pylint: disable=bare-except
            log.exception(
                "Error attempting notification for user %s", notification_setting.user
            )


def get_daily_frontpage_settings_ids():
    """Returns daily frontpage digest NotificationSettings"""
    return (
        NotificationSettings.frontpage_settings()
        .filter(trigger_frequency=FREQUENCY_DAILY)
        .filter(user__is_active=True)
        .values_list("id", flat=True)
        .order_by("id")
        .iterator()
    )


def get_weekly_frontpage_settings_ids():
    """Returns weekly frontpage digest NotificationSettings"""
    return (
        NotificationSettings.frontpage_settings()
        .filter(trigger_frequency=FREQUENCY_WEEKLY)
        .filter(user__is_active=True)
        .values_list("id", flat=True)
        .order_by("id")
        .iterator()
    )


def _get_notifier_for_notification(notification):
    """Get the notifier for the notification's type

    Args:
        notification (NotificationBase): the notification to get a notifier for

    Returns:
        Notifier: instance of the notifier to use

    """
    notification_settings = NotificationSettings.objects.get(
        user=notification.user, notification_type=notification.notification_type
    )

    if notification.notification_type == NOTIFICATION_TYPE_FRONTPAGE:
        return frontpage.FrontpageDigestNotifier(notification_settings)
    if notification.notification_type == NOTIFICATION_TYPE_MODERATOR:
        # Moderator notifications no longer supported - discussions removed
        return None
    if notification.notification_type == NOTIFICATION_TYPE_COMMENTS:
        # Comment notifications no longer supported - discussions removed
        return None
    raise UnsupportedNotificationTypeError(
        f"Notification type '{notification.notification_type}' is unsupported"
    )


def send_unsent_email_notifications():
    """Send all notifications that haven't been sent yet"""
    for notification_ids in chunks(
        EmailNotification.objects.filter(state=EmailNotification.STATE_PENDING)
        .exclude(notification_type=NOTIFICATION_TYPE_FRONTPAGE)
        .values_list("id", flat=True),
        chunk_size=settings.NOTIFICATION_SEND_CHUNK_SIZE,
    ):
        EmailNotification.objects.filter(id__in=notification_ids).update(
            state=EmailNotification.STATE_SENDING
        )
        tasks.send_email_notification_batch.delay(notification_ids)

    for notification_ids in chunks(
        EmailNotification.objects.filter(
            state=EmailNotification.STATE_PENDING,
            notification_type=NOTIFICATION_TYPE_FRONTPAGE,
        ).values_list("id", flat=True),
        chunk_size=settings.NOTIFICATION_SEND_CHUNK_SIZE,
    ):
        EmailNotification.objects.filter(id__in=notification_ids).update(
            state=EmailNotification.STATE_SENDING
        )
        tasks.send_frontpage_email_notification_batch.delay(notification_ids)


def send_email_notification_batch(notification_ids):
    """Sends a batch of notifications

    Args:
        notification_ids (list of int): notification ids to send

    """
    for notification in EmailNotification.objects.filter(id__in=notification_ids):
        try:
            notifier = _get_notifier_for_notification(notification)
            notifier.send_notification(notification)
        except CancelNotificationError:
            log.debug("EmailNotification canceled: %s", notification.id)
            notification.state = EmailNotification.STATE_CANCELED
            notification.save()
        except:  # pylint: disable=bare-except
            log.exception("Error sending notification %s", notification)


def send_comment_notifications(post_id, comment_id, new_comment_id):
    """Deprecated - comment notifications no longer supported.
    Kept as stub for Phase 3 cleanup.
    """


def send_moderator_notifications(post_id, channel_name):
    """Sends post notifications to channel moderators (deprecated - no-op)

    Args:
        post_id (str): base36 post id
        channel_name (str): channel_name

    """
