"""Base implementation for sending notifications"""
import logging
from datetime import timedelta

from notifications.notifiers.exceptions import InvalidTriggerFrequencyError
from notifications.models import (
    NotificationBase,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
    FREQUENCY_IMMEDIATE,
)
from open_discussions.utils import (
    now_in_utc,
    normalize_to_start_of_day,
)

DELTA_ONE_DAY = timedelta(days=1)
DELTA_ONE_WEEK = timedelta(days=7)

log = logging.getLogger()


class BaseNotifier:
    "Base class for notifier"

    def __init__(self, notification_cls):
        if not issubclass(notification_cls, NotificationBase):
            raise AttributeError("'notification_cls' must be a subclass of NotificationBase")
        self.notification_cls = notification_cls

    def _get_most_recent_notification(self, notification_settings, before=None):
        """
        Get the most recent notification

        Args:
            notification_settings (NotificationSettings): settings for this user and notification_typem
            before (NotificationBase): notification to filter recent notifications before

        Returns:
            NotificationBase: concrete instance of a notification or None
        """
        query = self.notification_cls.objects.filter(
            user=notification_settings.user,
            notification_type=notification_settings.notification_type,
        )

        if before is not None:
            query = query.filter(created_on__lt=before.created_on)

        return query.order_by('-created_on').first()

    def can_notify(self, notification_settings, last_notification):
        """
        Returns true if we can notify this user based on their settings and when the last notification occurred

        Args:
            notification_settings (NotificationSettings): settings for this user and notification_type
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid

        Returns:
            bool: True if we're due to send another notification
        """
        # special case if we've never sent a notification or the setting is for an immediate send
        if last_notification is None or notification_settings.trigger_frequency == FREQUENCY_IMMEDIATE:
            return True

        # normalize now and created_on to the start of their respective days
        normalized_now = normalize_to_start_of_day(now_in_utc())
        normalized_created_on = normalize_to_start_of_day(last_notification.created_on)

        if notification_settings.trigger_frequency == FREQUENCY_DAILY:
            trigger_offset = DELTA_ONE_DAY
        elif notification_settings.trigger_frequency == FREQUENCY_WEEKLY:
            trigger_offset = DELTA_ONE_WEEK
        else:
            # practically, we'd only see this if our code called a notifier invalidly for a NEVER trigger_frequency
            raise InvalidTriggerFrequencyError(
                "Unsupported trigger_frequency: {}".format(notification_settings.trigger_frequency)
            )

        # return true if the normalized value is at least trigger_offset in the past
        return (normalized_created_on + trigger_offset) <= normalized_now

    def attempt_notify(self, notification_settings):
        """
        Attempts to notify the recipient

        Args:FEATURE_FRONTPAGE_EMAIL_DIGESTSFEATURE_FRONTPAGE_EMAIL_DIGESTS
            notification_settings (NotificationSettings): settings for this user and notification_type
        """
        last_notification = self._get_most_recent_notification(notification_settings)

        if self.can_notify(notification_settings, last_notification):
            self.notify(notification_settings)

    def notify(self, notification_settings):
        """
        Attempts to notify the recipient via email

        Args:
            notification_settings (NotificationSettings): settings for this user and notification_type
        """
        return self._create_notification(notification_settings)

    def _create_notification(self, notification_settings):
        """
        Get the most recent notification

        Args:
            notification_settings (NotificationSettings): settings for this user and notification_type

        Returns:
            NotificationBase: concrete instance of a notification or None
        """
        return self.notification_cls.objects.create(
            user=notification_settings.user,
            notification_type=notification_settings.notification_type,
        )
