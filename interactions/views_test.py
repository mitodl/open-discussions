"""interactions views tests"""
import pytest
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status

from course_catalog.factories import (
    CourseFactory,
    ProgramFactory,
    UserListFactory,
    VideoFactory,
)
from interactions.factories import ContentTypeInteractionFactory
from interactions.models import ContentTypeInteraction
from interactions.serializers import PopularContentSerializer

pytestmark = pytest.mark.django_db


def test_content_type_interaction_create(client):
    """Test that the content type interaction API creates a record"""
    course = CourseFactory.create()
    content_type = ContentType.objects.get_for_model(course)

    assert ContentTypeInteraction.objects.count() == 0

    payload = {
        "interaction_type": "view",
        "content_type": content_type.name,
        "content_id": course.id,
    }

    response = client.post(reverse("interactions-list"), payload)

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json() == payload

    assert ContentTypeInteraction.objects.count() == 1

    interaction = ContentTypeInteraction.objects.first()
    assert interaction.interaction_type == "view"
    assert interaction.content == course


def test_popular_content_types(client, user, mocker):
    """Test the popular content types API"""
    # create 2 of each, generate interactions for only the first one
    # second one shouldn't show up in the results
    course = CourseFactory.create_batch(2)[0]
    program = ProgramFactory.create_batch(2)[0]
    user_list = UserListFactory.create_batch(2)[0]
    video = VideoFactory.create_batch(2)[0]

    # generate interactions with an increasing count
    interactions = [
        ContentTypeInteractionFactory.create_batch(count + 1, content=content)[0]
        for count, content in enumerate([user_list, video, course, program])
    ]

    response = client.get(reverse("popular_content-list"))

    # the response should be ordered such that items with a higher count of interactions are first
    # this ends up being the reverse order of `interactions` since we used `enumerate()`
    assert response.json() == {
        "results": PopularContentSerializer(
            [
                {
                    "content_type_id": interaction.content_type_id,
                    "content_id": interaction.content_id,
                }
                for interaction in reversed(interactions)
            ],
            many=True,
            context={"request": mocker.Mock(user=user)},
        ).data,
        "next": None,
        "previous": None,
        "count": len(interactions),
    }
