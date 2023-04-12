"""Notifier for frontpage digest"""
from datetime import datetime

from django.conf import settings
import pytz

from channels import api
from channels.proxies import proxy_posts
from channels.serializers import posts as post_serializers
from channels.utils import ListingParams
from course_catalog.models import PodcastEpisode
from course_catalog.serializers import PodcastEpisodeSerializer
from notifications.models import FREQUENCY_DAILY, FREQUENCY_WEEKLY
from notifications.notifiers.email import EmailNotifier
from notifications.notifiers.exceptions import (
    InvalidTriggerFrequencyError,
    CancelNotificationError,
)
from open_discussions import features

DAILY_LISTING_PARAMS = ListingParams(None, None, 0, api.POSTS_SORT_HOT)
WEEKLY_LISTING_PARAMS = ListingParams(None, None, 0, api.POSTS_SORT_TOP)


def _get_listing_params(trigger_frequency):
    """
    Returns the listing params for the given trigger_frequency

    Args:
        trigger_frequency (str): trigger frequency to query for

    Raises:
        InvalidTriggerFrequencyError: if the frequency is invalid for the frontpage digest

    Returns:
        ListingParams: the listing params configured for this trigger_frequency
    """
    if trigger_frequency == FREQUENCY_DAILY:
        return DAILY_LISTING_PARAMS
    elif trigger_frequency == FREQUENCY_WEEKLY:
        return WEEKLY_LISTING_PARAMS
    else:
        raise InvalidTriggerFrequencyError(
            "Trigger frequency '{}' is invalid for frontpage".format(trigger_frequency)
        )


def _is_post_after_notification(post, notification):
    """
    Returns True if the post was created after the specified notification

    Args:
        notification_settings (NotificationSettings): settings for this user and notification_type
        notification (NotificationBase): notification that was triggered for this NotificationSettings

    Returns:
        bool: True if the post was created after the specified notification
    """
    if notification is None:
        return True
    return datetime.fromtimestamp(post.created, tz=pytz.utc) > notification.created_on


def _posts_since_notification(notification_settings, notification):
    """
    Returns posts that were created after the given notification

    Args:
        notification_settings (NotificationSettings): settings for this user and notification_type
        notification (NotificationBase): notification that was triggered for this NotificationSettings

    Raises:
        InvalidTriggerFrequencyError: if the frequency is invalid

    Returns:
        list of praw.models.Submission: list of posts
    """
    user = notification_settings.user
    params = _get_listing_params(notification_settings.trigger_frequency)
    api_client = api.Api(user)

    posts = api_client.front_page(params)

    # filter posts
    posts = [
        post
        for post in posts
        if not post.stickied and _is_post_after_notification(post, notification)
    ]

    posts = proxy_posts(posts)
    posts = list(
        filter(lambda post: not post._self_post.exclude_from_frontpage_emails, posts)
    )
    posts = posts[: settings.OPEN_DISCUSSIONS_FRONTPAGE_DIGEST_MAX_POSTS]

    return posts


def _podcast_episodes_since_notification(notification):
    """
    Returns podcast episodes that were created after the given notification

    Args:
        notification (NotificationBase): notification

    Returns:
        list of PodcastEpisode: list of podcast episodes
    """

    episodes = PodcastEpisode.objects.filter(published=True).order_by("-last_modified")

    if notification:
        episodes = episodes.filter(last_modified__gt=notification.created_on)
    else:
        episodes = episodes.all()
    return episodes[: settings.OPEN_DISCUSSIONS_FRONTPAGE_DIGEST_MAX_EPISODES]


class FrontpageDigestNotifier(EmailNotifier):
    """Notifier for frontpage digests"""

    def __init__(self, notification_settings):
        super().__init__("frontpage", notification_settings)

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
        if features.is_enabled(features.FRONTPAGE_EMAIL_DIGESTS) and super().can_notify(
            last_notification
        ):

            # do this last as it's expensive if the others are False anyway
            # check if we have posts since the last notification
            return bool(
                _posts_since_notification(self.notification_settings, last_notification)
            ) or bool(_podcast_episodes_since_notification(last_notification))

        return False

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
        posts = _posts_since_notification(self.notification_settings, last_notification)
        podcast_episodes = _podcast_episodes_since_notification(last_notification)

        if not (posts or podcast_episodes):
            # edge case, nothing new to send even though we expected some
            raise CancelNotificationError()

        return {
            "posts": [
                post_serializers.PostSerializer(
                    post, context={"current_user": self.user}
                ).data
                for post in posts
            ],
            "episodes": [
                PodcastEpisodeSerializer(podcast_episode).data
                for podcast_episode in podcast_episodes
            ],
        }
