"""Tests for comments notifier"""
from django.core.mail import EmailMessage
import pytest

from notifications.factories import NotificationSettingsFactory
from notifications.models import EmailNotification
from notifications.notifiers import moderator_posts
from notifications.models import NOTIFICATION_TYPE_MODERATOR, FREQUENCY_IMMEDIATE
from open_discussions.test_utils import any_instance_of


pytestmark = [pytest.mark.django_db]


def test_create_moderator_post_event():
    """Tests that create_moderator_post_event works correctly"""
    notification_setting = NotificationSettingsFactory.create(immediate=True)
    notifier = moderator_posts.ModeratorPostsNotifier(notification_setting)
    event = notifier.create_moderator_post_event(notification_setting.user, "post_id")

    assert event.post_id == "post_id"
    assert event.email_notification is not None


@pytest.mark.betamax
def test_send_notification(
    mocker,
    reddit_factories,
    private_channel_and_contributor,
    staff_api,  # pylint:disable=unused-argument
):
    """Tests send_notification"""
    channel, user = private_channel_and_contributor
    notification_setting = NotificationSettingsFactory.create(
        user=user,
        trigger_frequency=FREQUENCY_IMMEDIATE,
        notification_type=NOTIFICATION_TYPE_MODERATOR,
        via_email=True,
    )
    notifier = moderator_posts.ModeratorPostsNotifier(notification_setting)

    send_messages_mock = mocker.patch("mail.api.send_messages")

    post = reddit_factories.text_post("just a post", user, channel=channel)

    event = notifier.create_moderator_post_event(notification_setting.user, post.id)
    note = event.email_notification
    note.state = EmailNotification.STATE_SENDING
    note.save()

    notifier.send_notification(note)

    send_messages_mock.assert_called_once_with([any_instance_of(EmailMessage)])
