"""Tests for course_catalog UserList views"""
from types import SimpleNamespace

import pytest
from django.urls import reverse

from course_catalog.constants import PrivacyLevel, UserListType
from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    UserListFactory,
    UserListItemFactory,
)
from course_catalog.models import UserList
from moira_lists.factories import MoiraListFactory
from open_discussions.factories import UserFactory

# pylint:disable=redefined-outer-name, use-maxsplit-arg


@pytest.fixture()
def mock_user_list_index(mocker):
    """Mocks index updating functions for user lists"""
    return SimpleNamespace(
        upsert_user_list=mocker.patch("course_catalog.serializers.upsert_user_list"),
        upsert_user_list_view=mocker.patch("course_catalog.views.upsert_user_list"),
        delete_empty_list=mocker.patch("course_catalog.serializers.delete_user_list"),
        delete_user_list=mocker.patch("course_catalog.views.delete_user_list"),
    )


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

    UserListItemFactory.create(user_list=user_list, position=1)
    UserListItemFactory.create(user_list=user_list, position=2)

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
        assert resp.data.get("item_count") == 2

    # Logged in user should see other person's public list
    resp = client.get(reverse("userlists-detail", args=[another_user_list.id]))
    assert resp.status_code == (403 if not is_public else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == another_user_list.title


def test_user_list_endpoint_get_all_public_lists(user_client):
    """If public=True, return all public user lists"""
    public_lists = UserListFactory.create_batch(
        4, privacy_level=PrivacyLevel.public.value
    )
    private_list = UserListFactory.create(privacy_level=PrivacyLevel.private.value)
    resp = user_client.get(reverse("userlists-list"), {"public": True})
    assert resp.status_code == 200
    response_list_ids = [user_list["id"] for user_list in resp.data.get("results")]
    assert len(response_list_ids) == 4
    assert private_list.id not in response_list_ids
    for user_list in public_lists:
        assert user_list.id in response_list_ids


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_staff", [True, False])
@pytest.mark.parametrize("is_super", [True, False])
@pytest.mark.parametrize("on_moira", [True, False])
@pytest.mark.parametrize("is_anonymous", [True, False])
def test_user_list_endpoint_create(  # pylint: disable=too-many-arguments
    client,
    is_anonymous,
    mock_user_list_index,
    is_public,
    is_staff,
    is_super,
    on_moira,
    settings,
):
    """Test userlist endpoint for creating a UserList"""
    staff_lists = ["test-list1", "test-list2"]
    settings.STAFF_MOIRA_LISTS = staff_lists
    user = UserFactory.create(is_staff=is_staff, is_superuser=is_super)
    if on_moira:
        user.moira_lists.set([MoiraListFactory(name=staff_lists[0])])
    if not is_anonymous:
        client.force_login(user)

    data = {
        "title": "My List",
        "privacy_level": (
            PrivacyLevel.public.value if is_public else PrivacyLevel.private.value
        ),
        "list_type": UserListType.LEARNING_PATH.value,
    }

    has_permission = is_staff or is_super or on_moira or not is_public
    resp = client.post(reverse("userlists-list"), data=data, format="json")
    assert resp.status_code == (403 if is_anonymous else 201 if has_permission else 400)
    if resp.status_code == 201:
        assert resp.data.get("title") == resp.data.get("title")
        assert resp.data.get("author") == user.id
        mock_user_list_index.upsert_user_list.assert_not_called()


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_staff", [True, False])
@pytest.mark.parametrize("update_topics", [True, False])
def test_user_list_endpoint_patch(
    client, mock_user_list_index, update_topics, is_public, is_staff
):
    """Test userlist endpoint for updating a UserList"""
    [original_topic, new_topic] = CourseTopicFactory.create_batch(2)
    list_user = UserFactory.create(is_staff=is_staff)
    userlist = UserListFactory.create(
        author=list_user,
        title="Title 1",
        topics=[original_topic],
        privacy_level=PrivacyLevel.private.value,
    )
    UserListItemFactory.create(user_list=userlist)

    client.force_login(list_user)

    data = {
        "title": "Title 2",
        "privacy_level": PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    }
    if update_topics:
        data["topics"] = [new_topic.id]

    resp = client.patch(
        reverse("userlists-detail", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (200 if (is_staff or not is_public) else 400)
    if resp.status_code == 200:
        assert resp.data["title"] == "Title 2"
        assert resp.data["topics"][0]["id"] == (
            new_topic.id if update_topics else original_topic.id
        )
        mock_user_list_index.upsert_user_list.assert_called_once_with(userlist.id)


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_items_endpoint_create_item(
    client, user, is_author, mock_user_list_index
):
    """Test userlistitems endpoint for creating a UserListItem"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    client.force_login(author if is_author else user)

    data = {"content_type": "course", "object_id": course.id}

    resp = client.post(
        reverse("userlistitems-list", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == (201 if is_author else 403)
    if resp.status_code == 201:
        assert resp.json().get("object_id") == course.id
        mock_user_list_index.upsert_user_list.assert_called_once_with(userlist.id)


def test_user_list_items_endpoint_create_item_bad_data(client, user):
    """Test userlistitems endpoint for creating a UserListItem"""
    userlist = UserListFactory.create(
        author=user, privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    client.force_login(user)

    data = {"content_type": "bad_content", "object_id": course.id}

    resp = client.post(
        reverse("userlistitems-list", args=[userlist.id]), data=data, format="json"
    )
    assert resp.status_code == 400
    assert resp.json() == {
        "non_field_errors": ["Incorrect object type bad_content"],
        "error_type": "ValidationError",
    }


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_items_endpoint_update_item(
    client, user, is_author, mock_user_list_index
):
    """Test userlistitems endpoint for updating UserListItem positions"""
    author = UserFactory.create()
    topics = CourseTopicFactory.create_batch(3)
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value, topics=topics
    )
    list_item_1 = UserListItemFactory.create(user_list=userlist, position=0)
    list_item_2 = UserListItemFactory.create(user_list=userlist, position=1)
    list_item_3 = UserListItemFactory.create(user_list=userlist, position=2)

    client.force_login(author if is_author else user)

    data = {"position": 0}

    resp = client.patch(
        reverse("userlistitems-detail", args=[userlist.id, list_item_3.id]),
        data=data,
        format="json",
    )
    assert resp.status_code == (200 if is_author else 403)
    if resp.status_code == 200:
        assert resp.json()["position"] == 0
        mock_user_list_index.upsert_user_list.assert_called_once_with(userlist.id)
        for idx, item in enumerate([list_item_3, list_item_1, list_item_2]):
            item.refresh_from_db()
            assert item.position == idx


def test_user_list_items_endpoint_update_items_wrong_list(client, user):
    """Verify that trying an update via userlistitems api in wrong list fails"""
    userlist = UserListFactory.create(
        author=user, privacy_level=PrivacyLevel.public.value
    )
    list_item_incorrect = UserListItemFactory.create()

    client.force_login(user)

    data = {"id": list_item_incorrect.id, "position": 44}

    resp = client.patch(
        reverse("userlistitems-detail", args=[userlist.id, list_item_incorrect.id]),
        data=data,
        format="json",
    )
    assert resp.status_code == 404


@pytest.mark.parametrize("is_author", [True, False])
def test_user_list_items_endpoint_delete_items(
    client, user, is_author, mock_user_list_index
):
    """Test userlistitems endpoint for deleting UserListItems"""
    author = UserFactory.create()
    userlist = UserListFactory.create(
        author=author, privacy_level=PrivacyLevel.public.value
    )
    list_items = sorted(
        UserListItemFactory.create_batch(2, user_list=userlist),
        key=lambda item: item.id,
    )

    client.force_login(author if is_author else user)

    resp = client.delete(
        reverse("userlistitems-detail", args=[userlist.id, list_items[0].id]),
        format="json",
    )
    assert resp.status_code == (204 if is_author else 403)
    if resp.status_code == 204:
        mock_user_list_index.upsert_user_list_view.assert_called_with(userlist.id)
        client.delete(
            reverse("userlistitems-detail", args=[userlist.id, list_items[1].id]),
            format="json",
        )
        mock_user_list_index.delete_user_list.assert_called_with(userlist)


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
