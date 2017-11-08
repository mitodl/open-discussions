"""
Factory for Users
"""
import ulid
from django.contrib.auth.models import User
from factory import LazyFunction, RelatedFactory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyText


class UserFactory(DjangoModelFactory):
    """Factory for Users"""
    username = LazyFunction(lambda: ulid.new().str)
    email = FuzzyText(suffix='@example.com')

    profile = RelatedFactory('profiles.factories.ProfileFactory', 'user')

    class Meta:
        model = User
