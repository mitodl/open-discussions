"""Factories for sites"""
import factory
from factory.django import DjangoModelFactory

from sites.models import AuthenticatedSite


class AuthenticatedSiteFactory(DjangoModelFactory):
    """Factory for AuthenticatedSite"""

    key = factory.Faker("word")
    title = factory.Faker("word")

    base_url = factory.Faker("url")
    login_url = factory.LazyAttribute(lambda o: "{}discussions".format(o.base_url))
    session_url = factory.LazyAttribute(
        lambda o: "{}discussionsToken".format(o.base_url)
    )
    tos_url = factory.LazyAttribute(lambda o: "{}terms_of_service".format(o.base_url))

    class Meta:
        model = AuthenticatedSite
