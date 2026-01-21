"""Tests for BaseNotifier"""
# pylint: disable=redefined-outer-name
from datetime import datetime, timedelta

import pytest
import pytz

from notifications.factories import NotificationSettingsFactory
from notifications.models import FREQUENCY_DAILY, FREQUENCY_WEEKLY, NotificationBase
from notifications.notifiers.base import DELTA_ONE_DAY, DELTA_ONE_WEEK, BaseNotifier
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

    with pytest.raises(AttributeError):
        BaseNotifier(_NotANotification, None)


@pytest.mark.parametrize("is_active", [True, False])
def test_can_notify_immediate(notifier, mocker, is_active):
    """Tests that if the settings are for immediate the notification triggers"""
    notifier.notification_settings = NotificationSettingsFactory.create(
        immediate=True, user__is_active=is_active
    )
    assert notifier.can_notify(mocker.Mock()) is is_active


@pytest.mark.parametrize("expected", [True, False])
@pytest.mark.parametrize("frequency", [FREQUENCY_DAILY, FREQUENCY_WEEKLY])
@pytest.mark.parametrize("hour_of_day", range(23))
def test_can_notify(notifier, mocker, frequency, expected, hour_of_day):
    """Tests that it triggers correctly given the last notification"""
    now = datetime(2018, 4, 18, hour_of_day, 0, 0, tzinfo=pytz.utc)
    if expected is False:
        offset = timedelta(0)
    else:
        offset = DELTA_ONE_DAY if frequency == FREQUENCY_DAILY else DELTA_ONE_WEEK
    mocker.patch("notifications.notifiers.base.now_in_utc", return_value=now)
    notifier.notification_settings = NotificationSettingsFactory.create(
        trigger_frequency=frequency
    )
    notification = mocker.Mock()
    notification.created_on = datetime(2018, 4, 18, 0, 0, 0, tzinfo=pytz.utc) - offset
    assert notifier.can_notify(notification) is expected


def test_can_notify_never(notifier, mocker):
    """Tests that if the settings are for never the can_notify is False"""
    notifier.notification_settings = NotificationSettingsFactory.create(never=True)
    assert notifier.can_notify(mocker.Mock()) is False


def test_can_notify_invalid_frequency(notifier, mocker):
    """Tests that this raises an error if an unsupported trigger_frequency is used"""
    notifier.notification_settings = NotificationSettingsFactory.create(
        trigger_frequency="bananas"
    )
    notification = mocker.Mock()
    notification.created_on = now_in_utc()
    with pytest.raises(InvalidTriggerFrequencyError):
        notifier.can_notify(notification)


@pytest.mark.parametrize("can_notify", [True, False])
def test_attempt_notify(notifier, mocker, can_notify):
    """Tests that this creates a new notification in pending status"""
    ns = NotificationSettingsFactory.create(immediate=True)
    notifier.notification_settings = ns
    mocker.patch.object(notifier, "can_notify", return_value=can_notify)

    notifier.attempt_notify()

    if can_notify:
        notifier.notification_cls.objects.create.assert_called_once_with(
            user=ns.user, notification_type=ns.notification_type
        )
    else:
        notifier.notification_cls.objects.create.assert_not_called()
