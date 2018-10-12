"""Factories for making test data"""
from factory import Faker
from factory.django import DjangoModelFactory, ImageField

from profiles.models import Profile


class ProfileFactory(DjangoModelFactory):
    """Factory for Profiles"""

    name = Faker("name")

    image = Faker("file_path", extension="jpg")
    image_small = Faker("file_path", extension="jpg")
    image_medium = Faker("file_path", extension="jpg")

    image_file = ImageField()
    image_small_file = ImageField()
    image_medium_file = ImageField()

    email_optin = Faker("boolean")

    class Meta:
        model = Profile
