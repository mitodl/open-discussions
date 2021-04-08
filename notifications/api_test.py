"""Tests for notification apis"""
from unittest.mock import Mock
import pytest

from channels.factories.models import SubscriptionFactory, ChannelFactory
from channels.api import add_user_role

from notifications.factories import (
    EmailNotificationFactory,
    NotificationSettingsFactory,
    PostEventFactory,
)
from notifications.models import (
    NotificationSettings,
    EmailNotification,
    CommentEvent,
    PostEvent,
    NOTIFICATION_TYPE_FRONTPAGE,
    NOTIFICATION_TYPE_COMMENTS,
    NOTIFICATION_TYPE_MODERATOR,
    FREQUENCY_NEVER,
    FREQUENCY_IMMEDIATE,
    FREQUENCY_DAILY,
    FREQUENCY_WEEKLY,
)
from notifications.notifiers.exceptions import CancelNotificationError
from notifications import api
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("is_moderator", (True, False))
@pytest.mark.parametrize("skip_moderator_setting", (True, False))
def test_ensure_notification_settings(user, is_moderator, skip_moderator_setting):
    """Assert that notification settings are created"""
    assert NotificationSettings.objects.filter(user=user).count() == 0

    if is_moderator:
        channel = ChannelFactory.create()
        add_user_role(channel, "moderators", user)

    api.ensure_notification_settings(
        user, skip_moderator_setting=skip_moderator_setting
    )

    if is_moderator and not skip_moderator_setting:
        assert NotificationSettings.objects.filter(user=user).count() == 3
        ns = NotificationSettings.objects.get(
            user=user, notification_type=NOTIFICATION_TYPE_MODERATOR
        )
        assert ns.via_app is False
        assert ns.via_email is True
        assert ns.trigger_frequency == FREQUENCY_IMMEDIATE

    else:
        assert NotificationSettings.objects.filter(user=user).count() == 2

    ns = NotificationSettings.objects.get(
        user=user, notification_type=NOTIFICATION_TYPE_FRONTPAGE
    )
    assert ns.via_app is False
    assert ns.via_email is True
    assert ns.trigger_frequency == FREQUENCY_DAILY

    ns = NotificationSettings.objects.get(
        user=user, notification_type=NOTIFICATION_TYPE_COMMENTS
    )
    assert ns.via_app is False
    assert ns.via_email is True
    assert ns.trigger_frequency == FREQUENCY_IMMEDIATE


@pytest.mark.parametrize("is_moderator", (True, False))
def test_ensure_notification_settings_existing(user, is_moderator):
    """Assert that existing notification settings are left alone"""
    settings_for_user = NotificationSettings.objects.filter(user=user)

    if is_moderator:
        channel = ChannelFactory.create()
        add_user_role(channel, "moderators", user)

    assert settings_for_user.count() == 0
    api.ensure_notification_settings(user)
    settings = list(settings_for_user)

    if is_moderator:
        assert settings_for_user.count() == 3
    else:
        assert settings_for_user.count() == 2

    frontpage_setting = settings[0]
    frontpage_setting.trigger_frequency = FREQUENCY_WEEKLY
    frontpage_setting.save()
    comments_settings = settings[1]
    comments_settings.trigger_frequency = FREQUENCY_NEVER
    comments_settings.save()

    if is_moderator:
        moderator_settings = settings[2]
        moderator_settings.trigger_frequency = FREQUENCY_NEVER
        moderator_settings.save()

    api.ensure_notification_settings(user)
    assert frontpage_setting.trigger_frequency == settings_for_user[0].trigger_frequency
    assert comments_settings.trigger_frequency == settings_for_user[1].trigger_frequency

    if is_moderator:
        assert (
            moderator_settings.trigger_frequency
            == settings_for_user[2].trigger_frequency
        )


def test_get_daily_frontpage_settings_ids():
    """Tests that get_daily_frontpage_settings_ids only triggers for daily settings"""
    notification_settings = NotificationSettingsFactory.create_batch(
        5, daily=True, frontpage_type=True
    )
    # these shouldn't show up
    NotificationSettingsFactory.create_batch(
        5, daily=True, frontpage_type=True, user__is_active=False
    )
    NotificationSettingsFactory.create_batch(5, weekly=True, frontpage_type=True)

    assert set(api.get_daily_frontpage_settings_ids()) == {
        ns.id for ns in notification_settings
    }


def test_get_weekly_frontpage_settings_ids():
    """Tests that get_weekly_frontpage_settings_ids only returns weekly settings"""
    notification_settings = NotificationSettingsFactory.create_batch(
        5, weekly=True, frontpage_type=True
    )
    # these shouldn't show up
    NotificationSettingsFactory.create_batch(
        5, weekly=True, frontpage_type=True, user__is_active=False
    )
    NotificationSettingsFactory.create_batch(5, daily=True, frontpage_type=True)

    assert set(api.get_weekly_frontpage_settings_ids()) == {
        ns.id for ns in notification_settings
    }


@pytest.mark.parametrize("side_effect", [None, Exception("bad_attempt_notify")])
def test_attempt_send_notification_batch(mocker, side_effect):
    """Verifies that attempt_send_notification_batch will attempt a notify on all settings"""
    notification_settings = NotificationSettingsFactory.create_batch(
        5, weekly=True, frontpage_type=True
    )
    mock_notifier = mocker.patch(
        "notifications.notifiers.frontpage.FrontpageDigestNotifier", autospec=True
    )
    mock_notifier_instance = mock_notifier.return_value
    mock_notifier_instance.side_effect = side_effect

    api.attempt_send_notification_batch([ns.id for ns in notification_settings])

    assert mock_notifier.call_count == len(notification_settings)

    for notificiation_setting in notification_settings:
        mock_notifier.assert_any_call(notificiation_setting)

    assert mock_notifier_instance.attempt_notify.call_count == len(
        notification_settings
    )


def test_send_unsent_email_notifications(mocker, settings):
    """Tests that send_unsent_email_notifications triggers a task for each batch"""

    settings.NOTIFICATION_SEND_CHUNK_SIZE = 75

    frontpage_notifications_ids = sorted(
        [
            note.id
            for note in EmailNotificationFactory.create_batch(150, frontpage_type=True)
        ]
    )

    other_notifications_ids = sorted(
        [
            note.id
            for note in EmailNotificationFactory.create_batch(150, comments_type=True)
        ]
    )

    mock_frontpage_task = mocker.patch(
        "notifications.tasks.send_frontpage_email_notification_batch"
    ).delay

    mock_other_notifications_task = mocker.patch(
        "notifications.tasks.send_email_notification_batch"
    ).delay

    assert (
        EmailNotification.objects.filter(state=EmailNotification.STATE_SENDING).count()
        == 0
    )

    api.send_unsent_email_notifications()

    assert mock_frontpage_task.call_count == 2
    mock_frontpage_task.assert_any_call(frontpage_notifications_ids[:75])
    mock_frontpage_task.assert_any_call(frontpage_notifications_ids[75:])

    assert mock_other_notifications_task.call_count == 2
    mock_other_notifications_task.assert_any_call(other_notifications_ids[:75])
    mock_other_notifications_task.assert_any_call(other_notifications_ids[75:])

    assert EmailNotification.objects.filter(
        state=EmailNotification.STATE_SENDING
    ).count() == len(frontpage_notifications_ids) + len(other_notifications_ids)


@pytest.mark.parametrize("should_cancel", (True, False))
@pytest.mark.parametrize(
    "notification_type, notifier_fqn",
    [
        (
            NOTIFICATION_TYPE_COMMENTS,
            "notifications.notifiers.comments.CommentNotifier",
        ),
        (
            NOTIFICATION_TYPE_FRONTPAGE,
            "notifications.notifiers.frontpage.FrontpageDigestNotifier",
        ),
        (
            NOTIFICATION_TYPE_MODERATOR,
            "notifications.notifiers.moderator_posts.ModeratorPostsNotifier",
        ),
    ],
)
def test_send_email_notification_batch(
    mocker, should_cancel, notification_type, notifier_fqn
):
    """Verify send_email_notification_batch calls the notifier for each of the notifications it is given"""

    notifications = EmailNotificationFactory.create_batch(
        5, notification_type=notification_type
    )

    if notification_type == NOTIFICATION_TYPE_MODERATOR:
        channel = ChannelFactory.create()

        mock_admin_api = Mock()

        mock_admin_api.get_post().subreddit.display_name = channel.name
        mocker.patch(
            "notifications.api.get_admin_api",
            autospec=True,
            return_value=mock_admin_api,
        )

        for notification in notifications:
            PostEventFactory.create(email_notification=notification)

            NotificationSettingsFactory.create(
                user=notification.user,
                notification_type=notification_type,
                channel=channel,
            )
    else:
        for notification in notifications:
            NotificationSettingsFactory.create(
                user=notification.user, notification_type=notification_type
            )

    mock_notifier = mocker.patch(notifier_fqn).return_value

    if should_cancel:
        mock_notifier.send_notification.side_effect = CancelNotificationError

    api.send_email_notification_batch([note.id for note in notifications])

    assert mock_notifier.send_notification.call_count == len(notifications)

    for notification in notifications:
        notification.refresh_from_db()
        mock_notifier.send_notification.assert_any_call(notification)

        if should_cancel:
            assert notification.state == EmailNotification.STATE_CANCELED


@pytest.mark.parametrize("post_id,comment_id", [("1", "4"), ("1", None)])
def test_send_comment_notifications(post_id, comment_id):
    """Tests that send_comment_notifications works correctly"""
    comment_users = UserFactory.create_batch(5)
    for user in comment_users:
        NotificationSettingsFactory.create(user=user, comments_type=True)
        # create both so we cover the notifiication deduplication
        SubscriptionFactory.create(user=user, post_id=post_id, comment_id=comment_id)
        SubscriptionFactory.create(user=user, post_id=post_id, comment_id=None)

    post_users = UserFactory.create_batch(5)
    for user in post_users:
        NotificationSettingsFactory.create(user=user, comments_type=True)
        SubscriptionFactory.create(user=user, post_id=post_id, comment_id=None)

    # create just a subscription for a user so we can test no settings scenario
    SubscriptionFactory.create(post_id=post_id, comment_id=comment_id)

    # create a bunch on other subscriptions
    SubscriptionFactory.create_batch(10)

    api.send_comment_notifications(post_id, comment_id, "abc")

    users = post_users + comment_users

    assert CommentEvent.objects.count() == len(users)
    for event in CommentEvent.objects.all():
        assert event.post_id == post_id
        assert event.comment_id == "abc"
        assert event.user in users


def test_send_moderator_notifications(mocker):
    """Tests that send_moderator_notifications works correctly"""

    mod_user = UserFactory.create()
    reddit_user = Mock()
    reddit_user.name = mod_user.username

    channel = ChannelFactory.create()

    mock_api = Mock()
    mock_api.list_moderators.return_value = [reddit_user]

    mocker.patch("notifications.api.get_admin_api", return_value=mock_api)

    NotificationSettingsFactory.create(
        user=mod_user, channel=channel, notification_type=NOTIFICATION_TYPE_MODERATOR
    )
    api.send_moderator_notifications("1", channel.name)

    assert PostEvent.objects.count() == 1
    event = PostEvent.objects.last()
    assert event.post_id == "1"
    assert event.user == mod_user

    assert EmailNotification.objects.count() == 1
    notification = EmailNotification.objects.last()
    assert notification.user == mod_user
    assert notification.notification_type == NOTIFICATION_TYPE_MODERATOR


def test_send_moderator_notifications_missing_setting(mocker):
    """
    Tests that send_moderator_notifications creates a new notification setting and continues
    if a moderator is missing a notification setting
    """

    mod_user = UserFactory.create()
    reddit_user = Mock()
    reddit_user.name = mod_user.username

    misconfigured_mod_user = UserFactory.create()
    misconfigured_reddit_user = Mock()
    misconfigured_reddit_user.name = misconfigured_mod_user.username

    channel = ChannelFactory.create()

    mock_api = Mock()
    mock_api.list_moderators.return_value = [misconfigured_reddit_user, reddit_user]

    mocker.patch("notifications.api.get_admin_api", return_value=mock_api)

    NotificationSettingsFactory.create(
        user=mod_user, channel=channel, notification_type=NOTIFICATION_TYPE_MODERATOR
    )
    api.send_moderator_notifications("1", channel.name)

    new_setting = NotificationSettings.objects.last()
    assert new_setting.user == misconfigured_mod_user
    assert new_setting.channel == channel
    assert new_setting.trigger_frequency == FREQUENCY_NEVER

    assert PostEvent.objects.count() == 2
    assert EmailNotification.objects.count() == 2
