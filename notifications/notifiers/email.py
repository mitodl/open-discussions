"""Email-based notifier"""
import logging

from mail import api
from notifications.notifiers.exceptions import CancelNotificationError
from notifications.notifiers.base import BaseNotifier
from notifications.models import (
    NotificationSettings,
    EmailNotification,
)
from notifications import utils
from open_discussions import features

log = logging.getLogger()


class EmailNotifier(BaseNotifier):
    """Notifier for email notifications"""
    def __init__(self, template_name):
        # sets notification_cls
        super().__init__(EmailNotification)
        self._template_name = template_name

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
        return (
            features.is_enabled(features.EMAIL_NOTIFICATIONS) and
            notification_settings.via_email and
            api.can_email_user(notification_settings.user) and
            super().can_notify(notification_settings, last_notification)
        )

    def _get_notification_data(self, notification_settings, last_notification):  # pylint: disable=unused-argument
        """
        Returns data for this notification
        """
        return {}

    def send_notification(self, email_notification):
        """
        Sends the notification to the user

        Args:
            email_notification (EmailNotification): the notification to be sent
        """
        messages = None
        user = email_notification.user
        notification_settings = NotificationSettings.objects.get(
            user=user,
            notification_type=email_notification.notification_type,
        )

        with utils.mark_as_sent_or_canceled(email_notification) as will_send:
            if not will_send:
                return

            last_notification = self._get_most_recent_notification(notification_settings, before=email_notification)

            data = self._get_notification_data(notification_settings, last_notification)

            # generate the message (there's only 1)
            messages = list(api.messages_for_recipients([
                (recipient, user, data) for recipient, user in api.safe_format_recipients([user])
            ], self._template_name))

            if not messages:
                raise CancelNotificationError()

        # we don't want an error sending to cause a resend, because it could cause us to actually send it twice
        if messages:
            # if we got this far and have messages, send them
            api.send_messages(messages)
