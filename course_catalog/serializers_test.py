"""
Test course_catalog serializers
"""
import pytest

from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    CoursePriceFactory,
    CourseInstructorFactory,
)
from course_catalog.serializers import CourseSerializer

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
    assert serializer.data["instructors"] == [
        " ".join([prof.first_name, prof.last_name]) for prof in course.instructors.all()
    ]
    assert len(serializer.data["topics"]) == 3
    assert serializer.data["topics"] == list(
        course.topics.values_list("name", flat=True)
    )
