"""Tests for EmailNotifier"""
# pylint: disable=redefined-outer-name
from django.core.mail import EmailMessage
import pytest

from notifications.factories import (
    EmailNotificationFactory,
    NotificationSettingsFactory,
)
from notifications.notifiers import email
from open_discussions import features
from open_discussions.test_utils import any_instance_of

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures('notifier_settings'),
]


@pytest.fixture
def notifier_settings(settings):
    """Default settings"""
    settings.FEATURES[features.EMAIL_NOTIFICATIONS] = True


@pytest.fixture
def notifier():
    """Fixture for EmailNotifier"""
    return email.EmailNotifier('frontpage')


@pytest.mark.parametrize('is_enabled', [True, False])
@pytest.mark.parametrize('can_notify', [True, False])
@pytest.mark.parametrize('via_email', [True, False])
def test_can_notify(settings, mocker, is_enabled, can_notify, via_email):
    """Test can_notify"""
    can_notify_mock = mocker.patch(
        'notifications.notifiers.base.BaseNotifier.can_notify',
        return_value=can_notify,
    )
    notifier = email.EmailNotifier('frontpage')
    ns_mock = mocker.Mock()
    ns_mock.via_email = via_email
    note_mock = mocker.Mock()
    settings.FEATURES[features.EMAIL_NOTIFICATIONS] = is_enabled

    expected = is_enabled and can_notify and via_email
    assert notifier.can_notify(ns_mock, note_mock) is expected

    if is_enabled and via_email:
        can_notify_mock.assert_called_once_with(ns_mock, note_mock)


def test_send_notification(notifier, mocker):
    """Tests send_notification"""
    send_once_mock = mocker.patch('notifications.utils.send_at_most_once')
    ns = NotificationSettingsFactory.create(user__profile__email_optin=True)
    note = EmailNotificationFactory.create(
        user=ns.user,
        notification_type=ns.notification_type,
        sending=True,
    )

    notifier.send_notification(note)

    send_once_mock.assert_called_once_with(note, any_instance_of(EmailMessage))
