"""Interactions factories"""
import factory
from django.contrib.contenttypes.models import ContentType
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from interactions.models import ContentTypeInteraction


class ContentTypeInteractionFactory(DjangoModelFactory):
    """Factory for ContentTypeInteraction"""

    interaction_type = FuzzyChoice(["view"])  # just one option for now
    content = factory.SubFactory("course_catalog.factories.CourseFactory")
    content_id = factory.SelfAttribute("content.id")
    content_type = factory.LazyAttribute(
        lambda o: ContentType.objects.get_for_model(o.content)
    )

    class Meta:
        model = ContentTypeInteraction
