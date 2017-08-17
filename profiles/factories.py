"""Factories for making test data"""
from factory import SubFactory, Faker
from factory.django import DjangoModelFactory

from open_discussions.factories import UserFactory
from profiles.models import Profile


class ProfileFactory(DjangoModelFactory):
    """Factory for Profiles"""
    user = SubFactory(UserFactory)

    name = Faker('name')

    image = Faker('file_path', extension='jpg')
    image_small = Faker('file_path', extension='jpg')
    image_medium = Faker('file_path', extension='jpg')

    class Meta:
        model = Profile
