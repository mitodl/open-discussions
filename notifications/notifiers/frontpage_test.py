"""Tests for frontpage notifier"""
from datetime import timedelta

from django.core.mail import EmailMessage
import pytest

from channels.factories.models import PostFactory
from channels.proxies import PostProxy
from course_catalog.factories import PodcastEpisodeFactory
from notifications.factories import (
    NotificationSettingsFactory,
    EmailNotificationFactory,
)
from notifications.models import EmailNotification, FREQUENCY_DAILY, FREQUENCY_WEEKLY
from notifications.notifiers import frontpage
from notifications.notifiers.exceptions import InvalidTriggerFrequencyError
from open_discussions import features
from open_discussions.utils import now_in_utc
from open_discussions.test_utils import any_instance_of

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("notifier_settings")]


@pytest.fixture
def notifier_settings(settings):
    """Default settings"""
    settings.FEATURES[features.EMAIL_NOTIFICATIONS] = True
    settings.FEATURES[features.FRONTPAGE_EMAIL_DIGESTS] = True


@pytest.mark.parametrize("is_enabled", [True, False])
@pytest.mark.parametrize("can_notify", [True, False])
@pytest.mark.parametrize("has_posts", [True, False])
@pytest.mark.parametrize("trigger_frequency", [FREQUENCY_DAILY, FREQUENCY_WEEKLY])
@pytest.mark.parametrize("has_last_notification", [True, False])
@pytest.mark.parametrize("has_posts_after", [True, False])
@pytest.mark.parametrize("has_episodes_after", [True, False])
@pytest.mark.parametrize("exclude_from_frontpage_emails", [True, False])
def test_can_notify(
    settings,
    mocker,
    is_enabled,
    can_notify,
    has_posts,
    trigger_frequency,
    has_last_notification,
    has_posts_after,
    has_episodes_after,
    exclude_from_frontpage_emails,
):  # pylint: disable=too-many-arguments, too-many-locals
    """Test can_notify"""
    notification_settings = NotificationSettingsFactory.create(
        trigger_frequency=trigger_frequency
    )
    notification = (
        EmailNotificationFactory.create(
            user=notification_settings.user, frontpage_type=True, sent=True
        )
        if has_last_notification
        else None
    )
    settings.FEATURES[features.FRONTPAGE_EMAIL_DIGESTS] = is_enabled
    can_notify_mock = mocker.patch(
        "notifications.notifiers.email.EmailNotifier.can_notify",
        return_value=can_notify,
    )
    created_on = notification.created_on if notification is not None else now_in_utc()

    episode = PodcastEpisodeFactory.create()
    if has_episodes_after:
        episode.last_modified = created_on + timedelta(days=10)
    else:
        episode.last_modified = created_on + timedelta(days=-10)
    episode.save()

    post = PostFactory.create(
        exclude_from_frontpage_emails=exclude_from_frontpage_emails
    )
    api_mock = mocker.patch("channels.api.Api")
    api_mock.return_value.front_page.return_value = (
        [
            mocker.Mock(
                id=post.post_id,
                created=int(
                    (
                        created_on + timedelta(days=10 if has_posts_after else -10)
                    ).timestamp()
                ),
                stickied=False,
            )
        ]
        if has_posts
        else []
    )
    notifier = frontpage.FrontpageDigestNotifier(notification_settings)

    expected = (
        is_enabled
        and can_notify
        and (
            not has_last_notification
            or (has_posts and has_posts_after and not exclude_from_frontpage_emails)
            or has_episodes_after
        )
    )
    assert notifier.can_notify(notification) is expected

    if is_enabled:
        can_notify_mock.assert_called_once_with(notification)


def test_can_notify_never():
    """Verify it returns False for notifications set to never"""
    notification_settings = NotificationSettingsFactory.create(
        never=True, via_email=True
    )
    notifier = frontpage.FrontpageDigestNotifier(notification_settings)
    assert notifier.can_notify(None) is False


def test_can_notify_invalid_frequency():
    """Verify it raises an error for an invalid frequency"""
    notification_settings = NotificationSettingsFactory.create(
        immediate=True, via_email=True
    )
    notifier = frontpage.FrontpageDigestNotifier(notification_settings)
    with pytest.raises(InvalidTriggerFrequencyError):
        notifier.can_notify(None)


def test_send_notification(mocker, user):
    """Tests send_notification"""
    ns = NotificationSettingsFactory.create(via_email=True, weekly=True)
    notifier = frontpage.FrontpageDigestNotifier(ns)
    post = PostFactory.create()
    episode = PodcastEpisodeFactory.create()
    send_messages_mock = mocker.patch("mail.api.send_messages")
    post_serializer_mock = mocker.patch("channels.serializers.posts.PostSerializer")
    post_serializer_mock.return_value.data = {
        "id": post.post_id,
        "title": "post's title",
        "slug": "a_slug",
        "channel_name": "micromasters",
        "channel_title": "MicroMasters",
        "created": now_in_utc().isoformat(),
        "author_id": user.username,
    }
    episode_serializer_mock = mocker.patch(
        "notifications.notifiers.frontpage.PodcastEpisodeSerializer"
    )
    episode_serializer_mock.return_value.data = {
        "title": "episode title",
        "podcast_title": "podcast title",
        "last_modified": now_in_utc().isoformat(),
    }
    submission = mocker.Mock(
        id=post.post_id, created=int(now_in_utc().timestamp()), stickied=False
    )
    api_mock = mocker.patch("channels.api.Api")
    api_mock.return_value.front_page.return_value = [submission]
    note = EmailNotificationFactory.create(
        user=ns.user, notification_type=ns.notification_type, sending=True
    )

    notifier.send_notification(note)

    post_serializer_mock.assert_called_once_with(
        PostProxy(submission, post), context={"current_user": note.user}
    )

    episode_serializer_mock.assert_called_once_with(episode)

    send_messages_mock.assert_called_once_with([any_instance_of(EmailMessage)])


def test_send_notification_no_posts_or_episodes(mocker):
    """Tests send_notification if there are somehow no posts or episodes"""
    ns = NotificationSettingsFactory.create(via_email=True, weekly=True)
    notifier = frontpage.FrontpageDigestNotifier(ns)
    send_messages_mock = mocker.patch("mail.api.send_messages")
    serializer_mock = mocker.patch("channels.serializers.posts.PostSerializer")
    api_mock = mocker.patch("channels.api.Api")
    api_mock.return_value.front_page.return_value = []
    note = EmailNotificationFactory.create(
        user=ns.user, notification_type=ns.notification_type, sending=True
    )

    notifier.send_notification(note)

    serializer_mock.assert_not_called()
    send_messages_mock.assert_not_called()

    note.refresh_from_db()
    assert note.state == EmailNotification.STATE_CANCELED
