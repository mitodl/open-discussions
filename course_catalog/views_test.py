"""Tests for course_catalog views"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from course_catalog.constants import PlatformType, ResourceType
from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    CoursePriceFactory,
    CourseInstructorFactory,
    BootcampFactory,
    ProgramFactory,
    UserListFactory,
    UserListBootcampFactory,
    UserListCourseFactory,
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

    resp = client.get(reverse("courses-list") + "new/")
    assert resp.data.get("count") == 1

    resp = client.get(reverse("courses-list") + "featured/")
    assert resp.data.get("count") == 0
    course.featured = True
    course.save()
    resp = client.get(reverse("courses-list") + "featured/")
    assert resp.data.get("count") == 1

    resp = client.get(reverse("courses-list") + "upcoming/")
    assert resp.data.get("count") == 0
    course.start_date = timezone.now() + timedelta(days=1)
    course.save()
    resp = client.get(reverse("courses-list") + "upcoming/")
    assert resp.data.get("count") == 1


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


def test_user_list_endpoint(client):
    """Test learning path endpoint"""
    user = UserFactory()
    user_list = UserListFactory(topics=CourseTopicFactory.create_batch(3), author=user)
    bootcamp_item = UserListBootcampFactory(user_list=user_list, position=1)
    course_item = UserListCourseFactory(user_list=user_list, position=2)

    resp = client.get(reverse("userlists-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("userlists-detail", args=[user_list.id]))
    assert resp.data.get("title") == user_list.title
    for item in resp.data.get("items"):
        if item.get("position") == 1:
            assert item.get("id") == bootcamp_item.id
        else:
            assert item.get("id") == course_item.id


def test_course_report(client):
    """Test ocw course report"""
    CourseFactory(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=False,
    )
    CourseFactory(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=True,
        image_src="",
    )
    CourseFactory(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=True,
        image_src="abc123",
    )
    CourseFactory(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.ocw_resource.value,
        published=False,
    )

    username = "test_user"
    password = "test_password"
    User.objects.create_user(username=username, password=password)
    client.login(username=username, password=password)
    resp = client.get(reverse("ocw-course-report"))
    assert resp.data == {
        "total_number_of_ocw_courses": 3,
        "published_ocw_courses_with_image": 2,
        "unpublished_ocw_courses": 1,
        "ocw_courses_without_image": 1,
        "ocw_resources": 1,
    }
