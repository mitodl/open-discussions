"""Notification Utils"""
import logging
from contextlib import contextmanager

from django.db import transaction

from notifications.models import EmailNotification
from notifications.notifiers.exceptions import CancelNotificationError
from open_discussions.utils import now_in_utc

log = logging.getLogger()


@contextmanager
def mark_as_sent_or_canceled(notification):
    """Marks the message as sent if it hasn't been yet or canceled if a cancel exception is raised

    Yeilds:
        bool: True if the email is being sent

    Args:
        notification (NotificationBase): notification to mark as sent

    """
    with transaction.atomic():
        notification = EmailNotification.objects.select_for_update().get(
            id=notification.id
        )
        if notification.state != EmailNotification.STATE_SENDING:
            # prevent sending an email that is not ready to be sent or already has been
            log.debug("EmailNotification not in sending state: %s", notification.id)
            yield False
            return

        try:
            yield True

            log.debug("EmailNotification sent: %s", notification.id)
            notification.state = EmailNotification.STATE_SENT
            notification.sent_at = now_in_utc()
            notification.save()
        except CancelNotificationError:
            log.debug("EmailNotification canceled: %s", notification.id)
            notification.state = EmailNotification.STATE_CANCELED
            notification.save()
        except:  # pylint: disable=bare-except
            # if any other error happens, roll back to pending so that the crontask picks it up again
            log.exception(
                "EmailNotification rolled back to pending: %s", notification.id
            )
            notification.state = EmailNotification.STATE_PENDING
            notification.save()
