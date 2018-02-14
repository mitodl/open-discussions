"""Notification models"""
from django.conf import settings
from django.db import models

from open_discussions.models import TimestampedModel

NOTIFICATION_TYPE_FRONTPAGE = "frontpage"
NOTIFICATION_TYPE_COMMENTS = "comments"
NOTIFICATION_TYPE_CHOICES = (
    (NOTIFICATION_TYPE_FRONTPAGE, "Frontpage"),
    (NOTIFICATION_TYPE_COMMENTS, "Comments"),
)
NOTIFICATION_TYPES = [choice[0] for choice in NOTIFICATION_TYPE_CHOICES]

FREQUENCY_IMMEDIATE = 'immediate'
FREQUENCY_DAILY = 'daily'
FREQUENCY_WEEKLY = 'weekly'
FREQUENCY_NEVER = 'never'
FREQUENCY_CHOICES = (
    (FREQUENCY_NEVER, 'Never'),
    (FREQUENCY_IMMEDIATE, 'Immediate'),
    # These we won't officially support until much later, but putting them in here as placeholders
    (FREQUENCY_DAILY, 'Daily'),
    (FREQUENCY_WEEKLY, 'Weekly'),
)
FREQUENCIES = [choice[0] for choice in FREQUENCY_CHOICES]


class NotificationSettings(TimestampedModel):
    """Notification settings"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_settings',
    )

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
    )

    via_app = models.BooleanField(default=False)
    via_email = models.BooleanField(default=True)

    trigger_frequency = models.CharField(
        max_length=10,
        choices=FREQUENCY_CHOICES,
        blank=False,
    )

    class Meta:
        unique_together = (('user', 'notification_type'),)
