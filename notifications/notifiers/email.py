"""Email-based notifier"""
import logging

from mail import api
from notifications import utils
from notifications.models import EmailNotification
from notifications.notifiers.base import BaseNotifier
from notifications.notifiers.exceptions import CancelNotificationError
from open_discussions import features

log = logging.getLogger()


class EmailNotifier(BaseNotifier):
    """Notifier for email notifications"""

    def __init__(self, template_name, notification_settings):
        # sets notification_cls
        super().__init__(EmailNotification, notification_settings)
        self._template_name = template_name

    def can_notify(self, last_notification):
        """Returns true if we can notify this user based on their settings and when the last notification occurred

        Args:
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid

        Returns:
            bool: True if we're due to send another notification

        """
        return (
            features.is_enabled(features.EMAIL_NOTIFICATIONS)
            and self.notification_settings.via_email
            and api.can_email_user(self.user)
            and super().can_notify(last_notification)
        )

    def _get_notification_data(
        self, current_notification, last_notification
    ):  # pylint: disable=unused-argument
        """Gets the data for this notification

        Args:
            current_notification (NotificationBase): current notification we're sending for
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid for the frontpage digest

        """
        return {}

    def send_notification(self, email_notification):
        """Sends the notification to the user

        Args:
            email_notification (EmailNotification): the notification to be sent

        """
        messages = None
        user = email_notification.user

        with utils.mark_as_sent_or_canceled(email_notification) as will_send:
            # check against programmer error
            if user != self.user:
                raise Exception("Notification user doesn't match settings user")

            # if we're trying to send an email, but the preference is never, we should just cancel it
            if self.notification_settings.is_triggered_never:
                raise CancelNotificationError()

            if not will_send:
                return

            last_notification = self._get_most_recent_notification(
                before=email_notification
            )

            data = self._get_notification_data(email_notification, last_notification)

            # generate the message (there's only 1)
            messages = list(
                api.messages_for_recipients(
                    [
                        (recipient, api.context_for_user(user=user, extra_context=data))
                        for recipient, user in api.safe_format_recipients([user])
                    ],
                    self._template_name,
                )
            )

            if not messages:
                raise CancelNotificationError()

        # we don't want an error sending to cause a resend, because it could cause us to actually send it twice
        if messages:
            # if we got this far and have messages, send them
            api.send_messages(messages)
