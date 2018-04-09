"""Tests for BaseNotifier"""
# pylint: disable=redefined-outer-name
from datetime import timedelta
import pytest

from notifications.factories import NotificationSettingsFactory
from notifications.models import (
    NotificationBase,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications.notifiers.base import BaseNotifier
from notifications.notifiers.exceptions import InvalidTriggerFrequencyError
from open_discussions.utils import now_in_utc

pytestmark = pytest.mark.django_db


@pytest.fixture
def notifier(mocker):
    """BaseNotifier fixture"""
    # bypass the typecheck here
    notifier = BaseNotifier(NotificationBase, None)
    notifier.notification_cls = mocker.Mock(spec=NotificationBase)
    return notifier


def test_invalid_notification_cls():
    """Tests that an AttributeError is raised"""
    class _NotANotification:
        """Dummy class that doesn't subclass NotificationBase"""
        pass

    with pytest.raises(AttributeError):
        BaseNotifier(_NotANotification, None)


def test_can_notify_immediate(notifier, mocker):
    """Tests that if the settings are for immediate the notification triggers"""
    notifier.notification_settings = NotificationSettingsFactory.create(immediate=True)
    assert notifier.can_notify(mocker.Mock()) is True


@pytest.mark.parametrize('frequency,offset_hours,expected', [
    (FREQUENCY_DAILY, int(24*1.5), True),
    (FREQUENCY_DAILY, int(24*0.5), False),
    (FREQUENCY_WEEKLY, int(24*7.5), True),
    (FREQUENCY_WEEKLY, int(24*6.5), False),
])
def test_can_notify(notifier, mocker, frequency, offset_hours, expected):
    """Tests that it triggers correctly given the last notification"""
    notifier.notification_settings = NotificationSettingsFactory.create(trigger_frequency=frequency)
    notification = mocker.Mock()
    notification.created_on = now_in_utc() - timedelta(hours=offset_hours)
    assert notifier.can_notify(notification) is expected


def test_can_notify_invalid_frequency(notifier, mocker):
    """Tests that this raises an error if an unsupported trigger_frequency is used"""
    notifier.notification_settings = NotificationSettingsFactory.create(trigger_frequency='bananas')
    notification = mocker.Mock()
    notification.created_on = now_in_utc()
    with pytest.raises(InvalidTriggerFrequencyError):
        notifier.can_notify(notification)


@pytest.mark.parametrize('can_notify', [True, False])
def test_attempt_notify(notifier, mocker, can_notify):
    """Tests that this creates a new notification in pending status"""
    ns = NotificationSettingsFactory.create(immediate=True)
    notifier.notification_settings = ns
    mocker.patch.object(notifier, 'can_notify', return_value=can_notify)

    notifier.attempt_notify()

    if can_notify:
        notifier.notification_cls.objects.create.assert_called_once_with(
            user=ns.user,
            notification_type=ns.notification_type,
        )
    else:
        notifier.notification_cls.objects.create.assert_not_called()
