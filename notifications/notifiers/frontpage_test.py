"""Tests for frontpage notifier"""
from datetime import timedelta

from django.core.mail import EmailMessage
import pytest

from notifications.factories import (
    NotificationSettingsFactory,
    EmailNotificationFactory,
)
from notifications.models import (
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
    FREQUENCY_NEVER,
    FREQUENCY_IMMEDIATE,
)
from notifications.notifiers import frontpage
from notifications.notifiers.exceptions import (
    InvalidTriggerFrequencyError,
    MissingNotificationDataError,
)
from open_discussions import features
from open_discussions.utils import now_in_utc
from open_discussions.test_utils import any_instance_of

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures('notifier_settings'),
]


@pytest.fixture
def notifier_settings(settings):
    """Default settings"""
    settings.FEATURES[features.EMAIL_NOTIFICATIONS] = True
    settings.FEATURES[features.FRONTPAGE_EMAIL_DIGESTS] = True


@pytest.mark.parametrize('is_enabled', [True, False])
@pytest.mark.parametrize('can_notify', [True, False])
@pytest.mark.parametrize('has_posts', [True, False])
@pytest.mark.parametrize('trigger_frequency', [
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
])
@pytest.mark.parametrize('has_last_notification', [True, False])
@pytest.mark.parametrize('has_posts_after', [True, False])
def test_can_notify(
        settings, mocker, is_enabled, can_notify, has_posts, trigger_frequency, has_last_notification, has_posts_after
):  # pylint: disable=too-many-arguments
    """Test can_notify"""
    notification_settings = NotificationSettingsFactory.create(trigger_frequency=trigger_frequency)
    notification = EmailNotificationFactory.create(
        user=notification_settings.user,
        frontpage_type=True,
        sent=True,
    ) if has_last_notification else None
    settings.FEATURES[features.FRONTPAGE_EMAIL_DIGESTS] = is_enabled
    can_notify_mock = mocker.patch(
        'notifications.notifiers.email.EmailNotifier.can_notify',
        return_value=can_notify,
    )
    created_on = notification.created_on if notification is not None else now_in_utc()
    api_mock = mocker.patch('channels.api.Api')
    api_mock.return_value.front_page.return_value = [
        mocker.Mock(
            created=(created_on + timedelta(days=10 if has_posts_after else -10)).timestamp(),
            stickied=False,
        ),
    ] if has_posts else []
    notifier = frontpage.FrontpageDigestNotifier()

    expected = is_enabled and can_notify and has_posts and (
        not has_last_notification or has_posts_after
    )
    assert notifier.can_notify(notification_settings, notification) is expected

    if is_enabled:
        can_notify_mock.assert_called_once_with(notification_settings, notification)


@pytest.mark.parametrize('trigger_frequency', [
    FREQUENCY_IMMEDIATE,
    FREQUENCY_NEVER,
])
def test_can_notify_invalid_frequency(trigger_frequency):
    """Verify it raises an error for an invalid frequency"""
    notification_settings = NotificationSettingsFactory.create(
        user__profile__email_optin=True,
        trigger_frequency=trigger_frequency,
        via_email=True,
    )
    notifier = frontpage.FrontpageDigestNotifier()
    with pytest.raises(InvalidTriggerFrequencyError):
        notifier.can_notify(notification_settings, None)


def test_send_notification(mocker):
    """Tests send_notification"""
    notifier = frontpage.FrontpageDigestNotifier()
    send_once_mock = mocker.patch('notifications.utils.send_at_most_once')
    serializer_mock = mocker.patch('channels.serializers.PostSerializer')
    serializer_mock.return_value.data = {
        'id': 1,
        'title': 'post title',
        'channel_name': 'micromasters',
        'channel_title': 'MicroMasters',
    }
    post = mocker.Mock(
        created=now_in_utc().timestamp(),
        stickied=False,
    )
    api_mock = mocker.patch('channels.api.Api')
    api_mock.return_value.front_page.return_value = [post]
    ns = NotificationSettingsFactory.create(
        user__profile__email_optin=True,
        via_email=True,
        weekly=True,
    )
    note = EmailNotificationFactory.create(
        user=ns.user,
        notification_type=ns.notification_type,
        sending=True,
    )

    notifier.send_notification(note)

    serializer_mock.assert_called_once_with(post)

    send_once_mock.assert_called_once_with(note, any_instance_of(EmailMessage))


def test_send_notification_no_posts(mocker):
    """Tests send_notification if there are somehow no posts"""
    notifier = frontpage.FrontpageDigestNotifier()
    send_once_mock = mocker.patch('notifications.utils.send_at_most_once')
    serializer_mock = mocker.patch('channels.serializers.PostSerializer')
    api_mock = mocker.patch('channels.api.Api')
    api_mock.return_value.front_page.return_value = []
    ns = NotificationSettingsFactory.create(
        user__profile__email_optin=True,
        via_email=True,
        weekly=True,
    )
    note = EmailNotificationFactory.create(
        user=ns.user,
        notification_type=ns.notification_type,
        sending=True,
    )

    with pytest.raises(MissingNotificationDataError):
        notifier.send_notification(note)

    serializer_mock.assert_not_called()
    send_once_mock.assert_not_called()
