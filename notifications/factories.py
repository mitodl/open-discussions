"""Factories for making test data"""
import factory
import pytz
from factory import Faker, SubFactory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from notifications.models import (
    FREQUENCIES,
    FREQUENCY_DAILY,
    FREQUENCY_IMMEDIATE,
    FREQUENCY_NEVER,
    FREQUENCY_WEEKLY,
    NOTIFICATION_TYPE_COMMENTS,
    NOTIFICATION_TYPE_FRONTPAGE,
    NOTIFICATION_TYPES,
    EmailNotification,
    NotificationSettings,
)
from open_discussions.factories import UserFactory


class NotificationSettingsFactory(DjangoModelFactory):
    """Factory for NotificationSettings"""

    user = SubFactory(UserFactory)
    notification_type = FuzzyChoice(NOTIFICATION_TYPES)

    via_app = Faker("boolean")
    via_email = Faker("boolean")

    trigger_frequency = FuzzyChoice(FREQUENCIES)

    class Meta:
        model = NotificationSettings

    class Params:
        frontpage_type = factory.Trait(notification_type=NOTIFICATION_TYPE_FRONTPAGE)
        comments_type = factory.Trait(notification_type=NOTIFICATION_TYPE_COMMENTS)

        immediate = factory.Trait(trigger_frequency=FREQUENCY_IMMEDIATE)
        weekly = factory.Trait(trigger_frequency=FREQUENCY_WEEKLY)
        daily = factory.Trait(trigger_frequency=FREQUENCY_DAILY)
        never = factory.Trait(trigger_frequency=FREQUENCY_NEVER)


class EmailNotificationFactory(DjangoModelFactory):
    """Factory for EmailNotification"""

    user = SubFactory(UserFactory)
    notification_type = FuzzyChoice(NOTIFICATION_TYPES)

    state = EmailNotification.STATE_PENDING
    sent_at = None

    class Meta:
        model = EmailNotification

    class Params:
        frontpage_type = factory.Trait(notification_type=NOTIFICATION_TYPE_FRONTPAGE)
        comments_type = factory.Trait(notification_type=NOTIFICATION_TYPE_COMMENTS)

        sent = factory.Trait(
            state=EmailNotification.STATE_SENT,
            sent_at=Faker("past_datetime", tzinfo=pytz.utc),
        )
        sending = factory.Trait(state=EmailNotification.STATE_SENDING)
