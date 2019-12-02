"""Tests for course_catalog views"""
from types import SimpleNamespace
from datetime import datetime
import pytz

import pytest
from django.contrib.auth.models import User
from django.urls import reverse

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
    VideoFactory,
    LearningResourceRunFactory,
)
from course_catalog.models import UserList, UserListItem
from course_catalog.serializers import CourseTopicSerializer
from open_discussions.factories import UserFactory

# pylint:disable=redefined-outer-name


@pytest.fixture()
def mock_user_list_index(mocker):
    """Mocks index updating functions for user lists"""
    return SimpleNamespace(
        upsert_user_list=mocker.patch("course_catalog.serializers.upsert_user_list"),
        delete_user_list=mocker.patch("course_catalog.views.delete_user_list"),
    )


def test_list_course_endpoint(client):
    """Test course endpoint"""
    course = CourseFactory.create()
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list"))
    assert resp.data.get("count") == 1
    assert resp.data.get("results")[0]["id"] == course.id


def test_get_course_endpoint(client):
    """Test course detail endpoint"""
    course = CourseFactory.create()

    resp = client.get(reverse("courses-detail", args=[course.id]))

    assert resp.data.get("course_id") == course.course_id


def test_new_courses_endpoint(client):
    """Test new courses endpoint"""
    course = CourseFactory.create()
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list") + "new/")

    assert resp.data.get("count") == 1
    assert resp.data.get("results")[0]["id"] == course.id


@pytest.mark.parametrize("featured", [True, False])
def test_featured_courses_endpoint(client, featured):
    """Test featured courses endpoint"""
    course = CourseFactory.create(featured=featured)
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list") + "featured/")

    assert resp.data.get("count") == (1 if featured else 0)
    if featured:
        assert resp.data.get("results")[0]["id"] == course.id


@pytest.mark.parametrize(
    "kwargs, is_upcoming", [({"in_future": True}, True), ({"in_past": True}, False)]
)
def test_upcoming_courses_endpoint(client, kwargs, is_upcoming):
    """Test upcoming courses endpoint"""
    course = CourseFactory.create(runs=None)
    LearningResourceRunFactory.create(content_object=course, **kwargs)
    # this should be filtered out
    CourseFactory.create(runs=None)

    resp = client.get(reverse("courses-list") + "upcoming/")

    assert resp.data.get("count") == (1 if is_upcoming else 0)
    if is_upcoming:
        assert resp.data.get("results")[0]["id"] == course.id


def test_course_detail_endpoint_lists(user_client, user):
    """Test that author's list ids are included"""
    course = CourseFactory.create()
    user_lists = UserListFactory.create_batch(3, author=user)
    for user_list in user_lists:
        UserListCourseFactory.create(content_object=course, user_list=user_list)
    resp = user_client.get(reverse("courses-detail", args=[course.id]))
    assert sorted(resp.data.get("lists")) == sorted(
        [user_list.id for user_list in user_lists]
    )


def test_bootcamp_endpoint(client):
    """Test bootcamp endpoint"""
    bootcamp = BootcampFactory.create()

    resp = client.get(reverse("bootcamps-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("bootcamps-detail", args=[bootcamp.id]))
    assert resp.data.get("course_id") == bootcamp.course_id


def test_bootcamp_detail_endpoint_lists(user_client, user):
    """Test that author's list ids are included"""
    bootcamp = BootcampFactory.create()
    user_lists = UserListFactory.create_batch(2, author=user)
    for user_list in user_lists:
        UserListBootcampFactory.create(content_object=bootcamp, user_list=user_list)
    resp = user_client.get(reverse("bootcamps-detail", args=[bootcamp.id]))
    assert sorted(resp.data.get("lists")) == sorted(
        [user_list.id for user_list in user_lists]
    )


def test_program_endpoint(client):
    """Test program endpoint"""
    program = ProgramFactory.create()
    bootcamp_item = ProgramItemBootcampFactory.create(program=program, position=1)
    course_item = ProgramItemCourseFactory.create(program=program, position=2)

    resp = client.get(reverse("programs-list"))
    assert resp.data.get("count") == 1

    resp = client.get(reverse("programs-detail", args=[program.id]))
    assert resp.data.get("title") == program.title
    assert len(resp.data.get("lists")) == 0
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
    if is_author:
        assert "content_data" not in resp.data.get("results")[0]

    resp = client.get(reverse("userlists-detail", args=[user_list.id]))
    assert resp.status_code == (403 if not (is_public or is_author) else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == user_list.title
        assert len(resp.data.get("lists")) == 0
        for item in resp.data.get("items"):
            assert "content_data" in item
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
def test_user_list_endpoint_create(client, is_anonymous, mock_user_list_index):
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
        mock_user_list_index.upsert_user_list.assert_called_once_with(
            UserList.objects.first()
        )


@pytest.mark.parametrize("update_topics", [True, False])
def test_user_list_endpoint_patch(client, user, mock_user_list_index, update_topics):
    """Test userlist endpoint for updating a UserList"""
    [original_topic, new_topic] = CourseTopicFactory.create_batch(2)
    userlist = UserListFactory.create(
        author=user, title="Title 1", topics=[original_topic]
    )

    client.force_login(user)

    data = {"title": "Title 2"}
    if update_topics:
        data["topics"] = [new_topic.id]

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == 200
    assert UserList.objects.get(id=userlist.id).title == "Title 2"
    assert resp.data["topics"][0]["id"] == (
        new_topic.id if update_topics else original_topic.id
    )
    mock_user_list_index.upsert_user_list.assert_called_once_with(userlist)


@pytest.mark.parametrize("num_topics", [0, 2])
@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_create_item(
    client, user, is_author, mock_user_list_index, num_topics
):
    """Test userlist endpoint for creating a UserListItem"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    topic_ids = sorted(
        [topic.id for topic in CourseTopicFactory.create_batch(num_topics)]
    )

    client.force_login(author if is_author else user)

    data = {
        "items": [{"content_type": "course", "object_id": course.id}],
        "topics": topic_ids,
    }

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (200 if is_author else 403)
    if resp.status_code == 200:
        assert len(resp.data.get("items")) == 1
        assert resp.data.get("items")[0]["object_id"] == course.id
        assert (
            sorted([topic["id"] for topic in resp.data.get("topics", [])]) == topic_ids
        )
        mock_user_list_index.upsert_user_list.assert_called_once_with(userlist)


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
def test_user_list_endpoint_update_items(client, user, is_author, mock_user_list_index):
    """Test userlist endpoint for updating UserListItem positions"""
    author = UserFactory.create()
    topics = CourseTopicFactory.create_batch(3)
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value, topics=topics
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
        ],
        "topics": [topics[0].id],
    }

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (200 if is_author else 403)
    if resp.status_code == 200:
        assert resp.data.get("topics") == [
            CourseTopicSerializer(instance=topics[0]).data
        ]
        updated_items = resp.data.get("items")

        assert (
            updated_items[0]["position"] == 33
            and updated_items[0]["id"] == list_items[1].id
        )
        assert (
            updated_items[1]["position"] == 44
            and updated_items[1]["id"] == list_items[0].id
        )
        mock_user_list_index.upsert_user_list.assert_called_once_with(userlist)


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
def test_user_list_endpoint_delete_items(client, user, is_author, mock_user_list_index):
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
        mock_user_list_index.upsert_user_list.assert_called_with(userlist)


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_endpoint_delete(client, user, is_author, mock_user_list_index):
    """Test userlist endpoint for deleting a UserList"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )

    client.force_login(author if is_author else user)

    resp = client.delete(reverse("userlists-detail", args=[userlist.id]))
    assert resp.status_code == (204 if is_author else 403)
    assert UserList.objects.filter(id=userlist.id).exists() is not is_author
    assert mock_user_list_index.delete_user_list.call_count == (1 if is_author else 0)


@pytest.mark.usefixtures("transactional_db")
@pytest.mark.parametrize(
    "factory, route_name",
    [
        (CourseFactory, "courses-detail"),
        (ProgramFactory, "programs-detail"),
        (BootcampFactory, "bootcamps-detail"),
        (VideoFactory, "videos-detail"),
        (UserListFactory, "userlists-detail"),
    ],
)
def test_favorites(user_client, factory, route_name):
    """Test favoriting and unfavoriting"""
    # Test item is not favorited by default
    kwargs = (
        {"privacy_level": PrivacyLevel.public.value}
        if route_name == "userlists-detail"
        else {}
    )
    item = factory.create(**kwargs)
    path = reverse(route_name, args=[item.id])
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is False

    # Favorite course and test that it is favorited
    user_client.post(f"{path}favorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is True

    # Test that viewset gracefully handles favoriting an already favorited object
    user_client.post(f"{path}favorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is True

    # Test that course shows up in favorites endpoint
    resp = user_client.get(reverse("favorites-list"))
    assert resp.data.get("results")[0].get("content_data").get("id") == item.id

    # Unfavorite course and test that it is no longer favorited
    user_client.post(f"{path}unfavorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is False

    # Test that viewset gracefully handles unfavoriting an already unfavorited object
    user_client.post(f"{path}unfavorite/")
    resp = user_client.get(path)
    assert resp.data.get("is_favorite") is False


@pytest.mark.parametrize(
    "factory, route_name",
    [
        (CourseFactory, "courses-detail"),
        (ProgramFactory, "programs-detail"),
        (BootcampFactory, "bootcamps-detail"),
        (VideoFactory, "videos-detail"),
        (UserListFactory, "userlists-detail"),
    ],
)
def test_unautharized_favorites(client, factory, route_name):
    """Test favoriting and unfavoriting when not logged in"""
    kwargs = (
        {"privacy_level": PrivacyLevel.public.value}
        if route_name == "userlists-detail"
        else {}
    )
    item = factory.create(**kwargs)
    path = reverse(route_name, args=[item.id])
    resp = client.post(f"{path}favorite/")
    assert resp.status_code == 403

    resp = client.post(f"{path}unfavorite/")
    assert resp.status_code == 403


@pytest.mark.parametrize(
    "privacy_level", [PrivacyLevel.public.value, PrivacyLevel.private.value]
)
def test_favorite_lists_other_user(user_client, privacy_level):
    """Test favoriting and unfavoriting someone else's list"""
    is_public = privacy_level == PrivacyLevel.public.value
    userlist = UserListFactory.create(privacy_level=privacy_level)
    resp = user_client.post(
        reverse("userlists-detail", args=[userlist.id]) + "favorite/"
    )
    assert resp.status_code == 200 if is_public else 403

    resp = user_client.post(
        reverse("userlists-detail", args=[userlist.id]) + "unfavorite/"
    )
    assert resp.status_code == 200 if is_public else 403


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


def test_topic_endpoint(client):
    """Test topic endpoint"""
    topics = CourseTopicFactory.create_batch(5)

    resp = client.get(reverse("topics-list"))
    assert resp.data.get("count") == 5

    topic = topics[0]
    resp = client.get(reverse("topics-detail", args=[topic.id]))
    assert resp.data == CourseTopicSerializer(topic).data


def test_video_endpoint(client):
    """Test video endpoint"""
    video1 = VideoFactory.create(last_modified=datetime(2019, 10, 4, tzinfo=pytz.utc))
    video2 = VideoFactory.create(last_modified=datetime(2019, 10, 6, tzinfo=pytz.utc))
    video3 = VideoFactory.create(last_modified=datetime(2019, 10, 5, tzinfo=pytz.utc))

    resp = client.get(reverse("videos-list"))
    assert resp.data.get("count") == 3
    assert list(map(lambda video: video["id"], resp.data.get("results"))) == [
        video1.id,
        video2.id,
        video3.id,
    ]

    resp = client.get(reverse("videos-list") + "new/")
    assert resp.data.get("count") == 3
    assert list(map(lambda video: video["id"], resp.data.get("results"))) == [
        video2.id,
        video3.id,
        video1.id,
    ]

    resp = client.get(reverse("videos-detail", args=[video1.id]))
    assert resp.data.get("video_id") == video1.video_id
