"""Utils tests"""
from unittest.mock import MagicMock

import pytest
from praw.exceptions import APIException, PRAWException
from prawcore.exceptions import Forbidden, NotFound, Redirect

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


@pytest.mark.parametrize(
    "error,expected_cls",
    [
        (
            PRAWException("No 'Comment' data returned for thing t1_u5"),
            CancelNotificationError,
        ),
        (PRAWException("NOT TRANSLATED"), PRAWException),
        (APIException("FAKE_ERROR_TYPE", "", ""), APIException),
        (Exception("NOT TRANSLATED"), Exception),
    ]
    + [
        (APIException(error_type, "", ""), CancelNotificationError)
        for error_type in (
            "SUBREDDIT_NOTALLOWED",
            "SUBREDDIT_NOEXIST",
            "DELETED_COMMENT",
        )
    ]
    + [
        (
            error_cls(
                MagicMock(
                    # because of side-affecting constructors
                    headers={"location": "http://exmaple.com/"}
                )
            ),
            CancelNotificationError,
        )
        for error_cls in (Forbidden, NotFound, Redirect)
    ],
)
def test_praw_error_to_cancelled(error, expected_cls):
    """Test that each of the errors is correctly translated to CancelNotificationError or reraised"""
    with pytest.raises(expected_cls), utils.praw_error_to_cancelled():
        raise error
