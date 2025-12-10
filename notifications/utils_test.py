"""Utils tests"""
from unittest.mock import MagicMock

import pytest

from notifications import utils
from notifications.factories import EmailNotificationFactory
from notifications.models import EmailNotification
from notifications.notifiers.exceptions import CancelNotificationError

pytestmark = pytest.mark.django_db


def test_mark_as_sent_or_canceled():
    """Verify mark_as_sent_or_canceled marks the notification sent if no errors"""
    notification = EmailNotificationFactory.create(sending=True)

    with utils.mark_as_sent_or_canceled(notification) as will_send:
        assert will_send is True

    notification.refresh_from_db()
    assert notification.state == EmailNotification.STATE_SENT
    assert notification.sent_at is not None


def test_mark_as_sent_or_canceled_already_sent():
    """Verify mark_as_sent_or_canceled doesn't try to send if it is already sent"""
    notification = EmailNotificationFactory.create(sent=True)

    with utils.mark_as_sent_or_canceled(notification) as will_send:
        assert will_send is False

    notification.refresh_from_db()
    assert notification.state == EmailNotification.STATE_SENT


def test_mark_as_sent_or_canceled_cancel_error():
    """Verify mark_as_sent_or_canceled marks the task as canceled"""
    notification = EmailNotificationFactory.create(sending=True)

    with utils.mark_as_sent_or_canceled(notification) as will_send:
        assert will_send is True
        raise CancelNotificationError()

    notification.refresh_from_db()
    assert notification.state == EmailNotification.STATE_CANCELED
    assert notification.sent_at is None


def test_mark_as_sent_or_canceled_misc_error():
    """Verify mark_as_sent_or_canceled marks the task as pending if a non-send related error occurs"""
    notification = EmailNotificationFactory.create(sending=True)

    with utils.mark_as_sent_or_canceled(notification) as will_send:
        assert will_send is True
        raise Exception("some random error")  # pylint:disable=broad-exception-raised)

    notification.refresh_from_db()
    assert notification.state == EmailNotification.STATE_PENDING
    assert notification.sent_at is None
