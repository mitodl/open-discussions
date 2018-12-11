"""Factories for making test data"""
from factory import Faker
from factory.django import DjangoModelFactory, ImageField
from faker.providers import BaseProvider

from profiles.models import Profile, UserWebsite


class LocationProvider(BaseProvider):
    """Factory for location JSON"""

    cities = [
        "Boston, Massachusetts, United States of America",
        "Paris, France",
        "Venice, Veneto, Italy",
        "Paris, Île-de-France, France",
    ]

    def location(self):
        """Return location JSON with random city name"""
        return {"value": self.random_element(self.cities)}


Faker.add_provider(LocationProvider)


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

    locationJSON = Faker("location")

    class Meta:
        model = Profile


class UserWebsiteFactory(DjangoModelFactory):
    """Factory for UserWebsite"""

    url = Faker("url")

    class Meta:
        model = UserWebsite
