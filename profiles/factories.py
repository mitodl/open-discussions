"""Factories for making test data"""
from factory import Faker
from factory.django import DjangoModelFactory

from profiles.models import Profile


class ProfileFactory(DjangoModelFactory):
    """Factory for Profiles"""
    name = Faker('name')

    image = Faker('file_path', extension='jpg')
    image_small = Faker('file_path', extension='jpg')
    image_medium = Faker('file_path', extension='jpg')

    class Meta:
        model = Profile
