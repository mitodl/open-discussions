"""Tests for course_catalog views"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.urls import reverse
from django.utils import timezone

from course_catalog.constants import PlatformType, ResourceType
from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
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
    course = CourseFactory(topics=CourseTopicFactory.create_batch(3))

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
    course_run = course.course_runs.all().order_by("-start_date")[0]
    course_run.start_date = timezone.now() + timedelta(days=1)
    course_run.save()
    resp = client.get(reverse("courses-list") + "upcoming/")
    assert resp.data.get("count") == 1


def test_bootcamp_endpoint(client):
    """Test bootcamp endpoint"""
    bootcamp = BootcampFactory(topics=CourseTopicFactory.create_batch(3))

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


def test_favorites(client):
    """Test favoriting and unfavoriting"""
    username = "test_user"
    password = "test_password"
    User.objects.create_user(username=username, password=password)
    client.login(username=username, password=password)

    # Test course is not favorited by default
    course = CourseFactory.create()
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert not resp.data.get("is_favorite")

    # Favorite course and test that it is favorited
    client.post(reverse("courses-detail", args=[course.id]) + "favorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("is_favorite")

    # Test that viewset gracefully handles favoriting an already favorited object
    with transaction.atomic():
        client.post(reverse("courses-detail", args=[course.id]) + "favorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("is_favorite")

    # Test that course shows up in favorites endpoint
    resp = client.get(reverse("favorites-list"))
    assert resp.data.get("results")[0].get("content_data").get("id") == course.id

    # Unfavorite course and test that it is no longer favorited
    client.post(reverse("courses-detail", args=[course.id]) + "unfavorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert not resp.data.get("is_favorite")

    # Test that viewset gracefully handles unfavoriting an already unfavorited object
    client.post(reverse("courses-detail", args=[course.id]) + "unfavorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert not resp.data.get("is_favorite")


def test_unautharized_favorites(client):
    """Test favoriting and unfavoriting when not logged in"""
    course = CourseFactory.create()
    resp = client.post(reverse("courses-detail", args=[course.id]) + "favorite/")
    assert resp.status_code == 403

    resp = client.post(reverse("courses-detail", args=[course.id]) + "unfavorite/")
    assert resp.status_code == 403


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
