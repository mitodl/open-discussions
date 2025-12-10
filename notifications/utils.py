"""Notification Utils"""
import logging
from contextlib import contextmanager

from django.db import transaction
from praw.exceptions import APIException, PRAWException
from prawcore.exceptions import Forbidden, NotFound, Redirect

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


@contextmanager
def praw_error_to_cancelled():
    """Raises CancelNotificationErrors from certain praw errors, otherwise raises the original error"""
    try:
        yield
    except (Forbidden, NotFound, Redirect) as exc:
        raise CancelNotificationError() from exc
    except APIException as exc:
        if exc.error_type in (
            "SUBREDDIT_NOTALLOWED",
            "SUBREDDIT_NOEXIST",
            "DELETED_COMMENT",
        ):
            raise CancelNotificationError() from exc
        raise
    except PRAWException as exc:
        # special case if the user isn't a contributor on channel we call comment.parent()
        if exc.args[0].startswith("No 'Comment' data returned for thing"):
            raise CancelNotificationError() from exc
        raise
