"""Tests for notifications tasks"""
import pytest

from notifications import tasks
from notifications.factories import NotificationSettingsFactory


@pytest.mark.django_db
def test_send_daily_frontpage_digests(mocker, settings, mocked_celery):
    """Tests that send_daily_frontpage_digests calls the API method"""
    notification_settings = NotificationSettingsFactory.create_batch(
        4, daily=True, frontpage_type=True
    )

    settings.NOTIFICATION_ATTEMPT_CHUNK_SIZE = 2
    mock_attempt_send_notification_batch = mocker.patch(
        "notifications.tasks.attempt_send_notification_batch", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.send_daily_frontpage_digests.delay()

    assert mocked_celery.group.call_count == 1

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])

    assert mock_attempt_send_notification_batch.si.call_count == 2

    mock_attempt_send_notification_batch.si.assert_any_call(
        [notification_settings[0].id, notification_settings[1].id]
    )
    mock_attempt_send_notification_batch.si.assert_any_call(
        [notification_settings[2].id, notification_settings[3].id]
    )


@pytest.mark.django_db
def test_send_weekly_frontpage_digests(mocker, settings, mocked_celery):
    """Tests that send_weekly_frontpage_digests calls the API method"""
    notification_settings = NotificationSettingsFactory.create_batch(
        4, weekly=True, frontpage_type=True
    )

    settings.NOTIFICATION_ATTEMPT_CHUNK_SIZE = 2
    mock_attempt_send_notification_batch = mocker.patch(
        "notifications.tasks.attempt_send_notification_batch", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        tasks.send_weekly_frontpage_digests.delay()

    assert mocked_celery.group.call_count == 1

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])

    assert mock_attempt_send_notification_batch.si.call_count == 2

    mock_attempt_send_notification_batch.si.assert_any_call(
        [notification_settings[0].id, notification_settings[1].id]
    )
    mock_attempt_send_notification_batch.si.assert_any_call(
        [notification_settings[2].id, notification_settings[3].id]
    )


def test_attempt_send_notification_batch(mocker):
    """Tests that attempt_send_notification_batch calls the API method"""
    api_mock = mocker.patch("notifications.api.attempt_send_notification_batch")

    ids = [1, 2, 3]
    tasks.attempt_send_notification_batch.delay(ids)
    api_mock.assert_called_once_with(ids)


def test_send_unsent_email_notifications(mocker):
    """Tests that send_unsent_email_notifications calls the API method"""
    api_mock = mocker.patch("notifications.api.send_unsent_email_notifications")

    tasks.send_unsent_email_notifications.delay()
    api_mock.assert_called_once_with()


def test_send_email_notification_batch(mocker):
    """Tests that send_email_notification_batch calls the API method"""
    api_mock = mocker.patch("notifications.api.send_email_notification_batch")

    ids = [1, 2, 3]
    tasks.send_email_notification_batch.delay(ids)
    api_mock.assert_called_once_with(ids)


def test_notify_subscribed_users(mocker):
    """Tests that notify_subscribed_users calls the API method"""
    api_mock = mocker.patch("notifications.api.send_comment_notifications")

    tasks.notify_subscribed_users.delay(1, 2, 3)
    api_mock.assert_called_once_with(1, 2, 3)
