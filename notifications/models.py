"""Notification models"""
from django.conf import settings
from django.db import models
from django.db.models.constraints import UniqueConstraint

from open_discussions.models import TimestampedModel

NOTIFICATION_TYPE_FRONTPAGE = "frontpage"
NOTIFICATION_TYPE_COMMENTS = "comments"
NOTIFICATION_TYPE_MODERATOR = "moderator_posts"
NOTIFICATION_TYPE_CHOICES = (
    (NOTIFICATION_TYPE_FRONTPAGE, "Frontpage"),
    (NOTIFICATION_TYPE_COMMENTS, "Comments"),
    (NOTIFICATION_TYPE_MODERATOR, "Moderator"),
)
NOTIFICATION_TYPES = [choice[0] for choice in NOTIFICATION_TYPE_CHOICES]

FREQUENCY_IMMEDIATE = "immediate"
FREQUENCY_DAILY = "daily"
FREQUENCY_WEEKLY = "weekly"
FREQUENCY_NEVER = "never"
FREQUENCY_CHOICES = (
    (FREQUENCY_NEVER, "Never"),
    (FREQUENCY_IMMEDIATE, "Immediate"),
    (FREQUENCY_DAILY, "Daily"),
    (FREQUENCY_WEEKLY, "Weekly"),
)
FREQUENCIES = [choice[0] for choice in FREQUENCY_CHOICES]

DELIVERY_TYPE_EMAIL = "email"
DELIVERY_TYPE_IN_APP = "in_app"
DELIVERY_TYPE_CHOICES = (
    (DELIVERY_TYPE_EMAIL, "Email"),
    (DELIVERY_TYPE_IN_APP, "In App"),
)


class NotificationSettings(TimestampedModel):
    """Notification settings"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_settings",
    )

    notification_type = models.CharField(
        max_length=20, choices=NOTIFICATION_TYPE_CHOICES
    )

    via_app = models.BooleanField(default=False)
    via_email = models.BooleanField(default=True)

    trigger_frequency = models.CharField(
        max_length=10, choices=FREQUENCY_CHOICES, blank=False
    )

    @classmethod
    def frontpage_settings(cls):
        """Returns a QuerySet filtered to frontpage notification settings"""
        return cls.objects.filter(notification_type=NOTIFICATION_TYPE_FRONTPAGE)

    @property
    def is_triggered_daily(self):
        """Returns True if the trigger_frequency is daily"""
        return self.trigger_frequency == FREQUENCY_DAILY

    @property
    def is_triggered_weekly(self):
        """Returns True if the trigger_frequency is weekly"""
        return self.trigger_frequency == FREQUENCY_WEEKLY

    @property
    def is_triggered_immediate(self):
        """Returns True if the trigger_frequency is immediate"""
        return self.trigger_frequency == FREQUENCY_IMMEDIATE

    @property
    def is_triggered_never(self):
        """Returns True if the trigger_frequency is never"""
        return self.trigger_frequency == FREQUENCY_NEVER

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=["user", "notification_type"],
                name="unique_user_notification_type",
            ),
        ]

        index_together = (("notification_type", "trigger_frequency"),)


class NotificationBase(TimestampedModel):
    """
    Abstract base model for notifications

    The intent here is to keep a core base behavior that is simple, but allow
    specific delivery mechanisms to add their own fields by having them be separate tables
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    notification_type = models.CharField(
        max_length=20, choices=NOTIFICATION_TYPE_CHOICES
    )

    class Meta:
        abstract = True

        index_together = (("user", "notification_type", "created_on"),)


class EmailNotification(NotificationBase):
    """Notification model for emails"""

    STATE_PENDING = "pending"
    STATE_SENDING = "sending"
    STATE_SENT = "sent"
    STATE_CANCELED = "canceled"
    STATE_CHOICES = (
        (STATE_PENDING, "Pending"),
        (STATE_SENDING, "Sending"),
        (STATE_SENT, "Sent"),
        (STATE_CANCELED, "Canceled"),
    )

    state = models.CharField(
        choices=STATE_CHOICES, max_length=10, default=STATE_PENDING
    )
    sent_at = models.DateTimeField(null=True)

    class Meta:
        index_together = (
            ("state", "updated_on"),
        ) + NotificationBase.Meta.index_together
