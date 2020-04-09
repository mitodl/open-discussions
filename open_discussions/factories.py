"""
Factory for Users
"""
import ulid
from django.conf import settings
from django.contrib.auth.models import User, Group
from social_core.backends.saml import SAMLAuth
from social_django.models import UserSocialAuth
from factory import LazyFunction, RelatedFactory, SubFactory, Trait, post_generation
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyText


class UserFactory(DjangoModelFactory):
    """Factory for Users"""

    username = LazyFunction(lambda: ulid.new().str)
    email = FuzzyText(suffix="@example.com")
    first_name = FuzzyText()
    last_name = FuzzyText()

    profile = RelatedFactory("profiles.factories.ProfileFactory", "user")

    class Meta:
        model = User

    class Params:
        no_profile = Trait(profile=None)


class GroupFactory(DjangoModelFactory):
    """Factory for Groups"""

    name = FuzzyText()

    class Meta:
        model = Group


class UserSocialAuthFactory(DjangoModelFactory):
    """Factory for UserSocialAuth"""

    provider = FuzzyText()
    user = SubFactory(UserFactory)
    uid = FuzzyText()

    class Meta:
        model = UserSocialAuth

    @post_generation
    def post_gen(self, create, extracted, **kwargs):  # pylint: disable=unused-argument
        """Set uid appropriately if the given provider is 'saml'"""
        if self.provider == SAMLAuth.name:
            self.uid = "{}:{}".format(
                settings.SOCIAL_AUTH_DEFAULT_IDP_KEY, self.user.email
            )
