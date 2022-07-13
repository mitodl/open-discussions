"""Factory classes for moira"""
import factory

from moira_lists.models import MoiraList

# pylint: disable=unused-argument


class MoiraListFactory(factory.django.DjangoModelFactory):
    """Factory for Moira Lists"""

    name = factory.Sequence(lambda n: "moira_#%s" % n)

    @factory.post_generation
    def channels(self, create, extracted, **kwargs):
        """Create associated channels"""
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of groups were passed in, use them
            for channel in extracted:
                self.channels.add(channel)

    @factory.post_generation
    def users(self, create, extracted, **kwargs):
        """Create associated users"""
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A list of groups were passed in, use them
            for user in extracted:
                self.users.add(user)

    class Meta:
        model = MoiraList
