"""Factories for channels_fields"""
import factory

from channels.factories.utils import channel_name
from channels_fields.api import create_field_groups_and_roles
from channels_fields.models import FieldChannel


class FieldChannelFactory(factory.DjangoModelFactory):
    """Factory for a channels.models.Channel object"""

    name = factory.LazyAttributeSequence(channel_name)
    title = factory.Faker("text", max_nb_chars=50)
    about = factory.List(
        [
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
            factory.Dict({"node": "text", "value": factory.Faker("text")}),
        ]
    )

    @factory.post_generation
    def create_roles(
        self, create, extracted, **kwargs
    ):  # pylint: disable=unused-argument
        """Create the channel groups and roles after the channel is created"""
        if not create:
            return

        create_field_groups_and_roles(self)

    class Meta:
        model = FieldChannel
