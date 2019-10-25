"""Tests for course_catalog views"""
from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.db import transaction
from django.urls import reverse
from django.utils import timezone

from course_catalog.constants import PlatformType, ResourceType, PrivacyLevel, ListType
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
from course_catalog.models import UserList, UserListItem
from open_discussions.factories import UserFactory


def test_course_endpoint(client):
    """Test course endpoint"""
    course = CourseFactory.create(topics=CourseTopicFactory.create_batch(3))
    # this should be filtered out
    CourseFactory.create(runs=None)

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
    course_run = course.runs.order_by("-best_start_date")[0]
    course_run.start_date = timezone.now() + timedelta(days=1)
    course_run.save()
    resp = client.get(reverse("courses-list") + "upcoming/")
    assert resp.data.get("count") == 1


def test_bootcamp_endpoint(client):
    """Test bootcamp endpoint"""
    bootcamp = BootcampFactory.create(topics=CourseTopicFactory.create_batch(3))

    resp = client.get(reverse("bootcamps-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("bootcamps-detail", args=[bootcamp.id]))
    assert resp.data.get("course_id") == bootcamp.course_id


def test_program_endpoint(client):
    """Test program endpoint"""
    program = ProgramFactory.create(topics=CourseTopicFactory.create_batch(3))
    bootcamp_item = ProgramItemBootcampFactory.create(program=program, position=1)
    course_item = ProgramItemCourseFactory.create(program=program, position=2)

    resp = client.get(reverse("programs-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("programs-detail", args=[program.id]))
    assert resp.data.get("title") == program.title
    for item in resp.data.get("items"):
        if item.get("position") == 1:
            assert item.get("id") == bootcamp_item.id
        else:
            assert item.get("id") == course_item.id


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_get(client, is_public, is_author, user):
    """Test learning path endpoint"""
    author = UserFactory.create()
    user_list = UserListFactory.create(
        topics=CourseTopicFactory.create_batch(3),
        author=author,
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    another_user_list = UserListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    bootcamp_item = UserListBootcampFactory.create(user_list=user_list, position=1)
    course_item = UserListCourseFactory.create(user_list=user_list, position=2)

    # Anonymous users should get no results
    resp = client.get(reverse("userlists-list"))
    assert resp.data.get("count") == 0

    # Logged in user should get own lists
    client.force_login(author if is_author else user)
    resp = client.get(reverse("userlists-list"))
    assert resp.data.get("count") == (1 if is_author else 0)

    resp = client.get(reverse("userlists-detail", args=[user_list.id]))
    assert resp.status_code == (403 if not (is_public or is_author) else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == user_list.title
        for item in resp.data.get("items"):
            if item.get("position") == 1:
                assert item.get("id") == bootcamp_item.id
            else:
                assert item.get("id") == course_item.id

    # Logged in user should see other person's public list
    resp = client.get(reverse("userlists-detail", args=[another_user_list.id]))
    assert resp.status_code == (403 if not is_public else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == another_user_list.title


@pytest.mark.parametrize("is_anonymous", [True, False])
def test_user_list_endpoint_create(client, is_anonymous):
    """Test userlist endpoint for creating a UserList"""
    user = UserFactory.create()
    if not is_anonymous:
        client.force_login(user)

    data = {
        "title": "My List",
        "privacy_level": PrivacyLevel.public.value,
        "list_type": ListType.LEARNING_PATH.value,
    }

    resp = client.post(reverse("userlists-list"), data=data, format="json")
    assert resp.status_code == (403 if is_anonymous else 201)
    if resp.status_code == 201:
        assert resp.data.get("title") == resp.data.get("title")
        assert resp.data.get("author") == user.id


def test_user_list_endpoint_patch(client, user):
    """Test userlist endpoint for updating a UserList"""
    userlist = UserListFactory.create(author=user, title="Title 1")

    client.force_login(user)

    data = {"title": "Title 2"}

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == 200
    assert UserList.objects.get(id=userlist.id).title == "Title 2"


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_create_item(client, user, is_author):
    """Test userlist endpoint for creating a UserListItem"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    client.force_login(author if is_author else user)

    data = {"items": [{"content_type": "course", "object_id": course.id}]}

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (200 if is_author else 403)
    if resp.status_code == 200:
        assert len(resp.data.get("items")) == 1
        assert resp.data.get("items")[0]["object_id"] == course.id


def test_user_list_endpoint_create_item_bad_data(client, user):
    """Test userlist endpoint for creating a UserListItem"""
    userlist = UserListFactory.create(
        author=user, privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    client.force_login(user)

    data = {"items": [{"content_type": "bad_content", "object_id": course.id}]}

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == 400
    assert resp.json() == {
        "non_field_errors": ["Incorrect object type bad_content"],
        "error_type": "ValidationError",
    }


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_update_items(client, user, is_author):
    """Test userlist endpoint for updating UserListItem positions"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    list_items = sorted(
        UserListCourseFactory.create_batch(2, user_list=userlist),
        key=lambda item: item.position,
    )

    client.force_login(author if is_author else user)

    data = {
        "items": [
            {"id": list_items[0].id, "position": 44},
            {"id": list_items[1].id, "position": 33},
        ]
    }

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (200 if is_author else 403)
    if resp.status_code == 200:
        updated_items = sorted(
            resp.data.get("items"), key=lambda item: item["position"]
        )
        assert (
            updated_items[0]["position"] == 33
            and updated_items[0]["id"] == list_items[1].id
        )
        assert (
            updated_items[1]["position"] == 44
            and updated_items[1]["id"] == list_items[0].id
        )


def test_user_list_endpoint_update_items_wrong_list(client, user):
    """Verify that trying an update on UserListItem in wrong list fails"""
    userlist = UserListFactory.create(
        author=user, privacy_level=PrivacyLevel.public.value
    )
    list_item_incorrect = UserListCourseFactory.create(
        user_list=UserListFactory.create()
    )

    client.force_login(user)

    data = {"items": [{"id": list_item_incorrect.id, "position": 44}]}

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == 400
    assert resp.json() == [f"Item {list_item_incorrect.id} not in list"]


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_delete_items(client, user, is_author):
    """Test userlist endpoint for deleting UserListItems"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    list_items = sorted(
        UserListCourseFactory.create_batch(2, user_list=userlist),
        key=lambda item: item.id,
    )

    client.force_login(author if is_author else user)

    data = {"items": [{"id": list_items[0].id, "delete": True}]}

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (200 if is_author else 403)
    if resp.status_code == 200:
        updated_items = resp.data.get("items")
        assert len(updated_items) == 1
        assert updated_items[0]["id"] == list_items[1].id
        assert UserListItem.objects.filter(id=list_items[0].id).exists() is False

        data = {
            "items": [
                {
                    "object_id": list_items[1].object_id,
                    "content_type": "course",
                    "delete": True,
                }
            ]
        }

        resp = client.patch(
            reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
        )
        assert resp.status_code == 200
        updated_items = resp.data.get("items")
        assert len(updated_items) == 0
        assert UserListItem.objects.filter(id=list_items[1].id).exists() is False


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_delete(client, user, is_author):
    """Test userlist endpoint for deleting a UserList"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )

    client.force_login(author if is_author else user)

    resp = client.delete(reverse("userlists-detail", args=[userlist.id]))
    assert resp.status_code == (204 if is_author else 403)
    assert UserList.objects.filter(id=userlist.id).exists() is not is_author


def test_favorites(client):
    """Test favoriting and unfavoriting"""
    username = "test_user"
    password = "test_password"
    User.objects.create_user(username=username, password=password)
    client.login(username=username, password=password)

    # Test course is not favorited by default
    course = CourseFactory.create()
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("is_favorite") is False

    # Favorite course and test that it is favorited
    client.post(reverse("courses-detail", args=[course.id]) + "favorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("is_favorite") is True

    # Test that viewset gracefully handles favoriting an already favorited object
    with transaction.atomic():
        client.post(reverse("courses-detail", args=[course.id]) + "favorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("is_favorite") is True

    # Test that course shows up in favorites endpoint
    resp = client.get(reverse("favorites-list"))
    assert resp.data.get("results")[0].get("content_data").get("id") == course.id

    # Unfavorite course and test that it is no longer favorited
    client.post(reverse("courses-detail", args=[course.id]) + "unfavorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("is_favorite") is False

    # Test that viewset gracefully handles unfavoriting an already unfavorited object
    client.post(reverse("courses-detail", args=[course.id]) + "unfavorite/")
    resp = client.get(reverse("courses-detail", args=[course.id]))
    assert resp.data.get("is_favorite") is False


def test_unautharized_favorites(client):
    """Test favoriting and unfavoriting when not logged in"""
    course = CourseFactory.create()
    resp = client.post(reverse("courses-detail", args=[course.id]) + "favorite/")
    assert resp.status_code == 403

    resp = client.post(reverse("courses-detail", args=[course.id]) + "unfavorite/")
    assert resp.status_code == 403


def test_course_report(client):
    """Test ocw course report"""
    CourseFactory.create(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=False,
    )
    CourseFactory.create(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=True,
        image_src="",
    )
    CourseFactory.create(
        platform=PlatformType.ocw.value,
        learning_resource_type=ResourceType.course.value,
        published=True,
        image_src="abc123",
    )
    CourseFactory.create(
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
