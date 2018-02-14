"""Factories for making test data"""
from factory import (
    Faker,
    SubFactory,
)
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from open_discussions.factories import UserFactory
from notifications.models import (
    NotificationSettings,
    FREQUENCIES,
    NOTIFICATION_TYPES,
)


class NotificationSettingsFactory(DjangoModelFactory):
    """Factory for Profiles"""
    user = SubFactory(UserFactory)
    notification_type = FuzzyChoice(NOTIFICATION_TYPES)

    via_app = Faker('boolean')
    via_email = Faker('boolean')

    trigger_frequency = FuzzyChoice(FREQUENCIES)

    class Meta:
        model = NotificationSettings
