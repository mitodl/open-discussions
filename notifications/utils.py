"""Notification Utils"""
import logging

from django.db import transaction

from mail import api
from notifications.models import EmailNotification
from open_discussions.utils import now_in_utc

log = logging.getLogger()


def send_at_most_once(notification, message):
    """
    Guarantees we only sent this message at most one time

    Args:
        notification (NotificationBase): notification to mark as sent
        message (EmailMessage): message to send
    """
    with transaction.atomic():
        notification = EmailNotification.objects.select_for_update().get(id=notification.id)
        if notification.state != EmailNotification.STATE_SENDING:
            # prevent sending an email that is not ready to be sent or already has been
            log.debug("EmailNotification not in sending state: %s", notification.id)
            return

        notification.state = EmailNotification.STATE_SENT
        notification.sent_at = now_in_utc()
        notification.save()

    try:
        api.send_messages([message])
    except:  # pylint: disable=bare-except
        log.exception('Error sending email message')
