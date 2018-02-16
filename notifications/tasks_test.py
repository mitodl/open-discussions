"""Tests for notifications tasks"""
from notifications import tasks


def test_send_daily_frontpage_digests(mocker):
    """Tests that send_daily_frontpage_digests calls the API method"""
    api_mock = mocker.patch('notifications.api.send_daily_frontpage_digests')

    tasks.send_daily_frontpage_digests.delay()
    api_mock.assert_called_once_with()


def test_send_weekly_frontpage_digests(mocker):
    """Tests that send_weekly_frontpage_digests calls the API method"""
    api_mock = mocker.patch('notifications.api.send_weekly_frontpage_digests')

    tasks.send_weekly_frontpage_digests.delay()
    api_mock.assert_called_once_with()


def test_send_unsent_email_notifications(mocker):
    """Tests that send_unsent_email_notifications calls the API method"""
    api_mock = mocker.patch('notifications.api.send_unsent_email_notifications')

    tasks.send_unsent_email_notifications.delay()
    api_mock.assert_called_once_with()


def test_send_email_notification_batch(mocker):
    """Tests that send_email_notification_batch calls the API method"""
    api_mock = mocker.patch('notifications.api.send_email_notification_batch')

    ids = [1, 2, 3]
    tasks.send_email_notification_batch.delay(ids)
    api_mock.assert_called_once_with(ids)
