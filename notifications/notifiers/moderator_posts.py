"""Notifier for new posts for moderators"""
from django.db import transaction

from notifications.notifiers.email import EmailNotifier
from notifications.models import NOTIFICATION_TYPE_MODERATOR, PostEvent
from notifications.utils import praw_error_to_cancelled
from channels import api
from channels.serializers.posts import PostSerializer


class ModeratorPostsNotifier(EmailNotifier):
    """Notifier for posts for moderators"""

    def __init__(self, notification_settings):
        super().__init__(NOTIFICATION_TYPE_MODERATOR, notification_settings)

    def can_notify(self, last_notification):
        return True

    @praw_error_to_cancelled()
    def _get_notification_data(
        self, current_notification, last_notification
    ):  # pylint: disable=unused-argument
        """
        Gets the data for this notification

        Args:
            current_notification (NotificationBase): current notification we're sending for
            last_notification (NotificationBase): last notification that was triggered for this NotificationSettings
        """
        ctx = {"current_user": self.user}
        event = PostEvent.objects.get(email_notification=current_notification)
        api_client = api.Api(self.user)
        post = api_client.get_post(event.post_id)
        return {"post": PostSerializer(post, context=ctx).data, "moderator_email": True}

    def create_moderator_post_event(self, user, post_id):
        """
        Creates a new PostEvent

        Args:
            user (User): the moderator who should be notified
            post_id (str): the base36 id of the new post

        Returns:
            CommentEvent: the created event
        """
        kwargs = {}

        with transaction.atomic():
            kwargs["email_notification"] = self._create_notification()
            return PostEvent.objects.create(user=user, post_id=post_id, **kwargs)
