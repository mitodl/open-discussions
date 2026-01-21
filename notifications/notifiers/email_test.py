"""Tests for EmailNotifier"""
# pylint: disable=redefined-outer-name
import pytest
from django.core.mail import EmailMessage

from notifications.factories import (
    EmailNotificationFactory,
    NotificationSettingsFactory,
)
from notifications.models import FREQUENCY_NEVER, EmailNotification
from notifications.notifiers import email
from open_discussions import features
from open_discussions.test_utils import any_instance_of

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("notifier_settings")]


@pytest.fixture
def notifier_settings(settings):
    """Default settings"""
    settings.FEATURES[features.EMAIL_NOTIFICATIONS] = True


@pytest.fixture
def notifier():
    """Fixture for EmailNotifier"""
    return email.EmailNotifier(
        "frontpage", NotificationSettingsFactory.create(daily=True)
    )


@pytest.mark.parametrize("is_enabled", [True, False])
@pytest.mark.parametrize("can_notify", [True, False])
@pytest.mark.parametrize("via_email", [True, False])
def test_can_notify(settings, mocker, is_enabled, can_notify, via_email):
    """Test can_notify"""
    can_notify_mock = mocker.patch(
        "notifications.notifiers.base.BaseNotifier.can_notify", return_value=can_notify
    )
    ns = NotificationSettingsFactory.create(via_email=via_email)
    notifier = email.EmailNotifier("frontpage", ns)
    note_mock = mocker.Mock()
    settings.FEATURES[features.EMAIL_NOTIFICATIONS] = is_enabled

    expected = is_enabled and can_notify and via_email
    assert notifier.can_notify(note_mock) is expected

    if is_enabled and via_email:
        can_notify_mock.assert_called_once_with(note_mock)


def test_send_notification(notifier, mocker):
    """Tests send_notification"""
    send_messages_mock = mocker.patch("mail.api.send_messages")
    note = EmailNotificationFactory.create(
        user=notifier.user,
        notification_type=notifier.notification_settings.notification_type,
        sending=True,
    )

    notifier.send_notification(note)

    send_messages_mock.assert_called_once_with([any_instance_of(EmailMessage)])


def test_send_notification_already_sent(notifier, mocker):
    """Tests send_notification that it doesn't send a notification that has already been sent"""
    send_messages_mock = mocker.patch("mail.api.send_messages")
    note = EmailNotificationFactory.create(
        user=notifier.user,
        notification_type=notifier.notification_settings.notification_type,
        sent=True,
    )

    notifier.send_notification(note)

    send_messages_mock.assert_not_called()


def test_send_notification_no_messages(notifier, mocker):
    """Tests send_notification that it cancels the notification if a message can't be sent"""
    send_messages_mock = mocker.patch("mail.api.send_messages")
    mocker.patch("mail.api.messages_for_recipients", return_value=[])
    note = EmailNotificationFactory.create(
        user=notifier.user,
        notification_type=notifier.notification_settings.notification_type,
        sending=True,
    )

    notifier.send_notification(note)

    note.refresh_from_db()
    assert note.state == EmailNotification.STATE_CANCELED

    send_messages_mock.assert_not_called()


def test_send_notification_no_user_mismatch(notifier, mocker):
    """Tests send_notification that it raises an error if the user mismatches"""
    send_messages_mock = mocker.patch("mail.api.send_messages")
    mocker.patch("mail.api.messages_for_recipients", return_value=[])
    note = EmailNotificationFactory.create(
        notification_type=notifier.notification_settings.notification_type, sending=True
    )

    notifier.send_notification(note)

    note.refresh_from_db()
    assert note.state == EmailNotification.STATE_PENDING

    send_messages_mock.assert_not_called()


def test_send_notification_never(notifier, mocker):
    """Tests send_notification if trigger_frequency is never"""
    send_messages_mock = mocker.patch("mail.api.send_messages")
    notifier.notification_settings.trigger_frequency = FREQUENCY_NEVER
    note = EmailNotificationFactory.create(
        user=notifier.user,
        notification_type=notifier.notification_settings.notification_type,
        sending=True,
    )

    notifier.send_notification(note)
    note.refresh_from_db()
    assert note.state == EmailNotification.STATE_CANCELED

    send_messages_mock.assert_not_called()
