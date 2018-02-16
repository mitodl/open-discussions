"""Utils tests"""
import pytest

from notifications import utils
from notifications.factories import EmailNotificationFactory
from notifications.models import EmailNotification

pytestmark = pytest.mark.django_db


def test_send_at_most_once_sending(mocker):
    """Verify send_at_most_once sends a message"""
    notification = EmailNotificationFactory.create(sending=True)
    send_messages_mock = mocker.patch('mail.api.send_messages')
    message = mocker.Mock()

    utils.send_at_most_once(notification, message)

    send_messages_mock.assert_called_once_with([message])

    notification.refresh_from_db()
    assert notification.state == EmailNotification.STATE_SENT
    assert notification.sent_at is not None


def test_send_at_most_once_sent(mocker):
    """Verify send_at_most_once does not sent an already sent message"""
    notification = EmailNotificationFactory.create(sent=True)
    send_messages_mock = mocker.patch('mail.api.send_messages')
    message = mocker.Mock()

    utils.send_at_most_once(notification, message)

    send_messages_mock.assert_not_called()


def test_send_at_most_once_pending(mocker):
    """Verify send_at_most_once does not sent a pending message"""
    notification = EmailNotificationFactory.create()
    send_messages_mock = mocker.patch('mail.api.send_messages')
    message = mocker.Mock()

    utils.send_at_most_once(notification, message)

    send_messages_mock.assert_not_called()

    notification.refresh_from_db()
    assert notification.state == EmailNotification.STATE_PENDING
    assert notification.sent_at is None
