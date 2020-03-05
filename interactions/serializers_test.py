"""Tests for serializers"""
from django.contrib.contenttypes.models import ContentType
import pytest

from course_catalog.factories import (
    CourseFactory,
    UserListFactory,
    VideoFactory,
    ProgramFactory,
    BootcampFactory,
)
from course_catalog.serializers import GenericForeignKeyFieldSerializer
from interactions.serializers import (
    ContentTypeInteractionSerializer,
    PopularContentSerializer,
)

pytestmark = pytest.mark.django_db


def test_content_type_interactions_serializer_valid():
    """Verifies that valid data results in no errors"""
    course = CourseFactory.create()
    serializer = ContentTypeInteractionSerializer(
        data={
            "interaction_type": "view",
            "content_type": "course",
            "content_id": course.id,
        }
    )

    assert serializer.is_valid() is True
    assert serializer.errors == {}


def test_content_type_interactions_serializer_invalid():
    """Verifies that invalid data results in errors"""
    serializer = ContentTypeInteractionSerializer(
        data={
            "interaction_type": "view",
            "content_type": "course",
            "content_id": 1_000_000,
        }
    )

    assert serializer.is_valid() is False
    assert "content_id" in serializer.errors
    assert serializer.errors["content_id"][0].code == "invalid"

    serializer = ContentTypeInteractionSerializer(
        data={"interaction_type": "view", "content_type": "invalid", "content_id": 1}
    )

    assert serializer.is_valid() is False
    assert "content_type" in serializer.errors
    assert serializer.errors["content_type"][0].code == "does_not_exist"


@pytest.mark.parametrize("is_deleted", [True, False])
def test_popular_content_serializer(is_deleted):
    """Test PopularContentSerializer"""
    resources = [
        VideoFactory.create(),
        ProgramFactory.create(),
        CourseFactory.create(),
        UserListFactory.create(),
        BootcampFactory.create(),
    ]

    data = [
        {
            "content_type_id": ContentType.objects.get_for_model(resource).id,
            "content_id": resource.id,
        }
        for resource in resources
    ]

    if is_deleted:
        for resource in resources:
            resource.delete()
        resources = []

    # NOTE: we test PopularContentSerializer instead of PopularContentListSerializer
    #       because the list serializer is never used directly, but rather many=True tells
    #       PopularContentSerializer to delegate to PopularContentListSerializer
    results = PopularContentSerializer(data, many=True).data

    # should be sorted by the same order they were passed in
    assert results == [
        GenericForeignKeyFieldSerializer(resource).data for resource in resources
    ]
