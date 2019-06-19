"""Tests for course_catalog views"""

from django.urls import reverse

from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    CoursePriceFactory,
    CourseInstructorFactory,
    BootcampFactory,
    ProgramFactory,
    LearningPathFactory,
    LearningPathBootcampFactory,
    LearningPathCourseFactory,
    ProgramItemCourseFactory,
    ProgramItemBootcampFactory,
)
from open_discussions.factories import UserFactory


def test_course_endpoint(client):
    """Test course endpoint"""
    course = CourseFactory(
        topics=CourseTopicFactory.create_batch(3),
        prices=CoursePriceFactory.create_batch(2),
        instructors=CourseInstructorFactory.create_batch(2),
    )

    resp = client.get(reverse("courses-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("course_id") == course.course_id


def test_bootcamp_endpoint(client):
    """Test bootcamp endpoint"""
    bootcamp = BootcampFactory(
        topics=CourseTopicFactory.create_batch(3),
        prices=CoursePriceFactory.create_batch(2),
        instructors=CourseInstructorFactory.create_batch(2),
    )

    resp = client.get(reverse("bootcamps-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("bootcamps-detail", args=[bootcamp.id]))
    assert resp.data.get("course_id") == bootcamp.course_id


def test_program_endpoint(client):
    """Test program endpoint"""
    program = ProgramFactory(topics=CourseTopicFactory.create_batch(3))
    bootcamp_item = ProgramItemBootcampFactory(program=program, position=1)
    course_item = ProgramItemCourseFactory(program=program, position=2)

    resp = client.get(reverse("programs-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("programs-detail", args=[program.id]))
    assert resp.data.get("title") == program.title
    for item in resp.data.get("items"):
        if item.get("position") == 1:
            assert item.get("id") == bootcamp_item.id
        else:
            assert item.get("id") == course_item.id


def test_learning_path_endpoint(client):
    """Test learning path endpoint"""
    user = UserFactory()
    learning_path = LearningPathFactory(
        topics=CourseTopicFactory.create_batch(3), author=user
    )
    bootcamp_item = LearningPathBootcampFactory(learning_path=learning_path, position=1)
    course_item = LearningPathCourseFactory(learning_path=learning_path, position=2)

    resp = client.get(reverse("learningpaths-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("learningpaths-detail", args=[learning_path.id]))
    assert resp.data.get("title") == learning_path.title
    for item in resp.data.get("items"):
        if item.get("position") == 1:
            assert item.get("id") == bootcamp_item.id
        else:
            assert item.get("id") == course_item.id
