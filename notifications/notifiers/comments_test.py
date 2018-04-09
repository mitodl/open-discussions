"""Tests for comments notifier"""
from django.core.mail import EmailMessage
import pytest

from channels.models import Subscription
from channels.factories import SubscriptionFactory
from notifications.factories import NotificationSettingsFactory
from notifications.models import EmailNotification
from notifications.notifiers import comments
from open_discussions import features
from open_discussions.test_utils import any_instance_of

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('is_enabled', [True, False])
@pytest.mark.parametrize('can_notify', [True, False])
def test_can_notify(mocker, settings, is_enabled, can_notify):
    """Test that can_notify works correctly"""
    mock_can_notify = mocker.patch(
        'notifications.notifiers.email.EmailNotifier.can_notify',
        return_value=can_notify,
    )
    notifier = comments.CommentNotifier(None)
    settings.FEATURES[features.COMMENT_NOTIFICATIONS] = is_enabled
    mock_notification = mocker.Mock()
    expected = is_enabled and can_notify
    assert notifier.can_notify(mock_notification) is expected
    if is_enabled:
        mock_can_notify.assert_called_once_with(mock_notification)
    else:
        mock_can_notify.assert_not_called()


@pytest.mark.parametrize('is_immediate', [True, False])
@pytest.mark.parametrize('is_comment', [True, False])
def test_create_comment_event(is_immediate, is_comment):
    """Tests that create_comment_event works correctly"""
    ns = NotificationSettingsFactory.create(
        immediate=is_immediate,
        never=not is_immediate,
    )
    notifier = comments.CommentNotifier(ns)
    subscription = SubscriptionFactory.create(user=ns.user, is_comment=is_comment)
    event = notifier.create_comment_event(subscription, 'h')

    assert event.post_id == subscription.post_id
    assert event.comment_id == 'h'

    if is_immediate:
        assert event.email_notification is not None
    else:
        assert event.email_notification is None


@pytest.mark.betamax
@pytest.mark.parametrize('is_parent_comment', [True, False])
def test_send_notification(mocker, is_parent_comment, reddit_factories, private_channel_and_contributor):
    """Tests send_notification"""
    channel, user = private_channel_and_contributor
    ns = NotificationSettingsFactory.create(
        user=user,
        comments_type=True,
        via_email=True,
        immediate=True,
    )
    notifier = comments.CommentNotifier(ns)
    send_messages_mock = mocker.patch('mail.api.send_messages')
    post = reddit_factories.text_post('just a post', user, channel=channel)
    comment = reddit_factories.comment('just a comment', user, post_id=post.id)
    if is_parent_comment:
        subscription = Subscription.objects.create(user=user, comment_id=comment.id, post_id=post.id)
        comment = reddit_factories.comment('reply comment', user, comment_id=comment.id)
    else:
        subscription = Subscription.objects.create(user=user, post_id=post.id)

    event = notifier.create_comment_event(subscription, comment.id)
    note = event.email_notification
    note.state = EmailNotification.STATE_SENDING
    note.save()

    notifier.send_notification(note)

    send_messages_mock.assert_called_once_with([any_instance_of(EmailMessage)])
