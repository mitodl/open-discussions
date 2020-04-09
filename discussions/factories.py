"""Discussions factories"""
import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from channels.factories.utils import channel_name
from discussions import api
from discussions.constants import ChannelTypes
from discussions.models import Channel


class ChannelFactory(DjangoModelFactory):
    """Factory for a channels.models.Channel object"""

    name = factory.LazyAttributeSequence(channel_name)
    title = factory.Faker("text", max_nb_chars=50)
    channel_type = FuzzyChoice(ChannelTypes.values())
    about = factory.List(
        [
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
        ]
    )
    moderator_group = factory.SubFactory(
        "open_discussions.factories.GroupFactory",
        name=factory.LazyAttribute(
            lambda obj: f"Moderators: {obj.factory_parent.name}"
        ),
    )
    contributor_group = factory.SubFactory(
        "open_discussions.factories.GroupFactory",
        name=factory.LazyAttribute(
            lambda obj: f"Contributors: {obj.factory_parent.name}"
        ),
    )

    @factory.post_generation
    def create_permissions(
        self, create, extracted, **kwargs
    ):  # pylint: disable=unused-argument
        """Create the channel groups and roles after the channel is created"""
        if not create:
            return

        api.channels.create_channel_groups(self.name)
        api.channels.set_channel_permissions(self)

    class Meta:
        model = Channel

    class Params:
        is_public = factory.Trait(channel_type=ChannelTypes.PUBLIC.value)
        is_restricted = factory.Trait(channel_type=ChannelTypes.RESTRICTED.value)
        is_private = factory.Trait(channel_type=ChannelTypes.PRIVATE.value)
