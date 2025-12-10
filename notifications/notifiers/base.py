"""Base implementation for sending notifications"""
import logging
from datetime import timedelta

from notifications.models import NotificationBase
from notifications.notifiers.exceptions import InvalidTriggerFrequencyError
from open_discussions.utils import normalize_to_start_of_day, now_in_utc

DELTA_ONE_DAY = timedelta(days=1)
DELTA_ONE_WEEK = timedelta(days=7)

log = logging.getLogger()


class BaseNotifier:
    """Base class for notifier"""

    def __init__(self, notification_cls, notification_settings):
        if not issubclass(notification_cls, NotificationBase):
            raise AttributeError(
                "'notification_cls' must be a subclass of NotificationBase"
            )
        self.notification_cls = notification_cls
        self.notification_settings = notification_settings

    @property
    def user(self):
        """Returns the user for this notifier"""
        return self.notification_settings.user

    def _get_most_recent_notification(self, before=None):
        """Get the most recent notification

        Args:
            before (NotificationBase): notification to filter recent notifications before

        Returns:
            NotificationBase: concrete instance of a notification or None

        """
        query = self.notification_cls.objects.filter(
            user=self.user,
            notification_type=self.notification_settings.notification_type,
        )

        if before is not None:
            query = query.filter(created_on__lt=before.created_on)

        return query.order_by("-created_on").first()

    def can_notify(self, last_notification):
        """Returns true if we can notify this user based on their settings and when the last notification occurred

        Args:
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid

        Returns:
            bool: True if we're due to send another notification

        """
        if (
            not self.notification_settings.user.is_active
            or self.notification_settings.is_triggered_never
        ):
            return False

        # special case if we've never sent a notification or the setting is for an immediate send
        if (
            last_notification is None
            or self.notification_settings.is_triggered_immediate
        ):
            return True

        # normalize now and created_on to the start of their respective days
        normalized_now = normalize_to_start_of_day(now_in_utc())
        normalized_created_on = normalize_to_start_of_day(last_notification.created_on)

        if self.notification_settings.is_triggered_daily:
            trigger_offset = DELTA_ONE_DAY
        elif self.notification_settings.is_triggered_weekly:
            trigger_offset = DELTA_ONE_WEEK
        else:
            # practically, we'd only see this if our code called a notifier invalidly for a NEVER trigger_frequency
            raise InvalidTriggerFrequencyError(
                f"Unsupported trigger_frequency: {self.notification_settings.trigger_frequency}"
            )

        # return true if the normalized value is at least trigger_offset in the past
        return (normalized_created_on + trigger_offset) <= normalized_now

    def attempt_notify(self):
        """Attempts to notify the recipient

        Returns:
            NotificationBase: concrete instance of a notification or None

        """
        last_notification = self._get_most_recent_notification()

        if self.can_notify(last_notification):
            return self.notify()

        return None

    def notify(self):
        """Attempts to notify the recipient via email
        """
        return self._create_notification()

    def _create_notification(self):
        """Get the most recent notification

        Returns:
            NotificationBase: concrete instance of a notification or None

        """
        return self.notification_cls.objects.create(
            user=self.user,
            notification_type=self.notification_settings.notification_type,
        )
