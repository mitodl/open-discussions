"""Subscription notifiers"""
from django.db import transaction
from praw.models import Comment

from channels import api
from channels.serializers import (
    CommentSerializer,
    PostSerializer,
)
from notifications.models import CommentEvent
from notifications.notifiers.email import EmailNotifier
from open_discussions import features


class CommentNotifier(EmailNotifier):
    """Notifier for post/comment subscriptions"""
    def __init__(self, notification_settings):
        super().__init__('comments', notification_settings)

    def can_notify(self, last_notification):
        """
        Returns true if we can notify this user based on their settings and when the last notification occurred

        Args:
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid

        Returns:
            bool: True if we're due to send another notification
        """
        return (
            features.is_enabled(features.COMMENT_NOTIFICATIONS) and
            super().can_notify(last_notification)
        )

    def _get_notification_data(
            self, current_notification, last_notification
    ):  # pylint: disable=unused-argument
        """
        Gets the data for this notification

        Args:
            current_notification (NotificationBase): current notification we're sending for
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings

        Raises:
            InvalidTriggerFrequencyError: if the frequency is invalid for the frontpage digest
        """
        event = CommentEvent.objects.get(email_notification=current_notification)
        api_client = api.Api(self.user)
        comment = api_client.get_comment(event.comment_id)
        parent = comment.parent()
        is_comment_reply = isinstance(parent, Comment)
        ctx = {
            'current_user': self.user,
        }

        return {
            'is_comment_reply': is_comment_reply,
            'post': PostSerializer(comment.submission, context=ctx).data,
            'parent': (
                CommentSerializer(parent, context=ctx) if is_comment_reply
                else PostSerializer(parent, context=ctx)
            ).data,
            'comment': CommentSerializer(comment, context=ctx).data,
        }

    def create_comment_event(self, subscription, comment_id):
        """
        Creates a new CommentEvent

        Args:
            subscription (channels.models.Subscription): the subscription this event is triggered from
            comment_id (str): the base36 id of the new comment

        Returns:
            CommentEvent: the created event
        """
        kwargs = {}

        with transaction.atomic():
            # if this is an immediate trigger notification, create and assign the event to it right away
            if self.notification_settings.is_triggered_immediate:
                kwargs['email_notification'] = self._create_notification()

            return CommentEvent.objects.create(
                user=subscription.user,
                post_id=subscription.post_id,
                comment_id=comment_id,
                **kwargs,
            )
