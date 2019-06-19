"""
Test course_catalog serializers
"""
import pytest

from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    CoursePriceFactory,
    CourseInstructorFactory,
    BootcampFactory,
    ProgramFactory,
)
from course_catalog.models import ProgramItem
from course_catalog.serializers import (
    CourseSerializer,
    BootcampSerializer,
    ProgramItemSerializer,
)

pytestmark = pytest.mark.django_db


def test_serialize_course_related_models():
    """
    Verify that a serialized course contains attributes for related objects
    """
    course = CourseFactory(
        topics=CourseTopicFactory.create_batch(3),
        prices=CoursePriceFactory.create_batch(2),
        instructors=CourseInstructorFactory.create_batch(2),
    )
    serializer = CourseSerializer(course)
    assert len(serializer.data["prices"]) == 2
    for attr in ("mode", "price"):
        assert attr in serializer.data["prices"][0].keys()
    assert len(serializer.data["instructors"]) == 2
    for attr in ("first_name", "last_name"):
        assert attr in serializer.data["instructors"][0].keys()
    assert len(serializer.data["topics"]) == 3
    assert "name" in serializer.data["topics"][0].keys()


def test_serialize_bootcamp_related_models():
    """
    Verify that a serialized bootcamp contains attributes for related objects
    """
    bootcamp = BootcampFactory(
        topics=CourseTopicFactory.create_batch(3),
        prices=CoursePriceFactory.create_batch(2),
        instructors=CourseInstructorFactory.create_batch(2),
    )
    serializer = BootcampSerializer(bootcamp)
    assert len(serializer.data["prices"]) == 2
    for attr in ("mode", "price"):
        assert attr in serializer.data["prices"][0].keys()
    assert len(serializer.data["instructors"]) == 2
    for attr in ("first_name", "last_name"):
        assert attr in serializer.data["instructors"][0].keys()
    assert len(serializer.data["topics"]) == 3
    assert "name" in serializer.data["topics"][0].keys()


def test_generic_foreign_key_serializer():
    """
    Test that generic foreign key serializer properly rejects unexpected classes
    """
    program = ProgramFactory()
    course_topic = CourseTopicFactory()
    program_item = ProgramItem(program=program, item=course_topic)
    serializer = ProgramItemSerializer(program_item)
    with pytest.raises(Exception):
        assert serializer.data.get("item").get("id") == course_topic.id
