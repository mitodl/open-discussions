"""Factories for making test data"""
import pytz

import faker
import factory
from factory.django import DjangoModelFactory

from open_discussions.factories import UserFactory
from channels.models import RedditAccessToken, RedditRefreshToken

FAKE = faker.Factory.create()


class RedditRefreshTokenFactory(DjangoModelFactory):
    """Factory for refresh tokens"""
    user = factory.SubFactory(UserFactory)

    token_value = factory.Faker('word')

    class Meta:
        model = RedditRefreshToken


class RedditAccessTokenFactory(DjangoModelFactory):
    """Factory for access tokens"""
    user = factory.SubFactory(UserFactory)

    token_value = factory.Faker('word')
    token_expires_at = factory.LazyFunction(
        lambda: FAKE.date_time_this_year(before_now=False, after_now=True, tzinfo=pytz.utc)
    )

    class Meta:
        model = RedditAccessToken

    class Params:
        expired = factory.Trait(
            token_expires_at=factory.LazyFunction(
                lambda: FAKE.date_time_this_year(before_now=True, after_now=False, tzinfo=pytz.utc)
            )
        )
