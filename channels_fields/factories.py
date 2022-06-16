"""Factories for channels_fields"""
import factory

from channels.factories.utils import channel_name
from channels_fields.api import create_field_groups_and_roles
from channels_fields.models import FieldChannel


class FieldChannelFactory(factory.DjangoModelFactory):
    """Factory for a channels_fields.models.FieldChannel object"""

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
        """Create the field channel groups and roles after the field channel is created"""
        if not create:
            return

        create_field_groups_and_roles(self)

    class Meta:
        model = FieldChannel
