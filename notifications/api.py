"""Notifications API"""

from notifications.models import (
    NotificationSettings,
    NOTIFICATION_TYPE_FRONTPAGE,
    FREQUENCY_DAILY,
)


def ensure_notification_settings(user):
    """
    Populates user with notification settings

    Args:
        user (User): user to create settings for
    """
    existing_notification_types = NotificationSettings.objects.filter(
        user=user
    ).values_list('notification_type', flat=True)

    if NOTIFICATION_TYPE_FRONTPAGE not in existing_notification_types:
        NotificationSettings.objects.get_or_create(
            user=user,
            notification_type=NOTIFICATION_TYPE_FRONTPAGE,
            defaults={
                'trigger_frequency': FREQUENCY_DAILY,
            }
        )
