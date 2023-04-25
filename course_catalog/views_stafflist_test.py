"""Tests for course_catalog StaffList views"""
from types import SimpleNamespace

import pytest
from django.urls import reverse

from course_catalog.constants import PrivacyLevel, StaffListType
from course_catalog.factories import (
    CourseFactory,
    CourseTopicFactory,
    StaffListFactory,
    StaffListItemFactory,
)
from course_catalog.models import StaffList
from course_catalog.utils import update_editor_group
from open_discussions.factories import UserFactory

# pylint:disable=redefined-outer-name


@pytest.fixture()
def mock_staff_list_index(mocker):
    """Mocks index updating functions for staff lists"""
    return SimpleNamespace(
        upsert_staff_list=mocker.patch("course_catalog.serializers.upsert_staff_list"),
        upsert_staff_list_view=mocker.patch("course_catalog.views.upsert_staff_list"),
        delete_staff_list=mocker.patch("course_catalog.serializers.deindex_staff_list"),
        delete_staff_list_view=mocker.patch("course_catalog.views.deindex_staff_list"),
    )


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_editor", [True, False])
def test_staff_list_endpoint_get(client, is_public, is_editor, user):
    """Test staff list endpoint"""
    update_editor_group(user, is_editor)

    staff_list = StaffListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    another_staff_list = StaffListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    StaffListItemFactory.create(staff_list=staff_list, position=1)
    StaffListItemFactory.create(staff_list=staff_list, position=2)

    # Anonymous users should get public results
    resp = client.get(reverse("stafflists-list"))
    assert resp.data.get("count") == (2 if is_public else 0)
    if resp.data.get("results"):
        assert "content_data" not in resp.data.get("results")[0]

    # Logged in user should get public lists or all lists if editor
    client.force_login(user)
    resp = client.get(reverse("stafflists-list"))
    assert resp.data.get("count") == (2 if is_public or is_editor else 0)
    if resp.data.get("results"):
        assert "content_data" not in resp.data.get("results")[0]

    resp = client.get(reverse("stafflists-detail", args=[staff_list.id]))
    assert resp.status_code == (403 if not (is_public or is_editor) else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == staff_list.title
        assert len(resp.data.get("lists")) == 0
        assert resp.data.get("item_count") == 2

    # Logged in user should see other person's public list
    resp = client.get(reverse("stafflists-detail", args=[another_staff_list.id]))
    assert resp.status_code == (403 if not is_public and not is_editor else 200)
    if resp.status_code == 200:
        assert resp.data.get("title") == another_staff_list.title


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_staff", [True, False])
@pytest.mark.parametrize("is_super", [True, False])
@pytest.mark.parametrize("is_editor", [True, False])
@pytest.mark.parametrize("is_anonymous", [True, False])
def test_staff_list_endpoint_create(  # pylint: disable=too-many-arguments
    client,
    is_anonymous,
    is_public,
    is_staff,
    is_super,
    is_editor,
):
    """Test stafflist endpoint for creating a StaffList"""
    user = UserFactory.create(is_staff=is_staff, is_superuser=is_super)
    update_editor_group(user, is_editor)

    if not is_anonymous:
        client.force_login(user)

    data = {
        "title": "My List",
        "privacy_level": (
            PrivacyLevel.public.value if is_public else PrivacyLevel.private.value
        ),
        "list_type": StaffListType.PATH.value,
    }

    has_permission = not is_anonymous and (is_staff or is_super or is_editor)
    resp = client.post(reverse("stafflists-list"), data=data, format="json")
    assert resp.status_code == (201 if has_permission else 403)
    if resp.status_code == 201:
        assert resp.data.get("title") == resp.data.get("title")
        assert resp.data.get("author") == user.id


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_editor", [True, False])
@pytest.mark.parametrize("update_topics", [True, False])
def test_staff_list_endpoint_patch(client, update_topics, is_public, is_editor):
    """Test stafflist endpoint for updating a StaffList"""
    [original_topic, new_topic] = CourseTopicFactory.create_batch(2)
    user = UserFactory.create()
    update_editor_group(user, is_editor)
    stafflist = StaffListFactory.create(
        author=user,
        title="Title 1",
        topics=[original_topic],
        privacy_level=PrivacyLevel.private.value,
    )
    StaffListItemFactory.create(staff_list=stafflist)

    client.force_login(user)

    data = {
        "title": "Title 2",
        "privacy_level": PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    }
    if update_topics:
        data["topics"] = [new_topic.id]

    resp = client.patch(
        reverse("stafflists-detail", args=[stafflist.id]), data=data, format="json"
    )
    assert resp.status_code == (200 if is_editor else 403)
    if resp.status_code == 200:
        assert resp.data["title"] == "Title 2"
        assert resp.data["topics"][0]["id"] == (
            new_topic.id if update_topics else original_topic.id
        )


@pytest.mark.parametrize("is_editor", [True, False])
def test_staff_list_items_endpoint_create_item(
    mock_staff_list_index, client, user, is_editor
):
    """Test stafflistitems endpoint for creating a StaffListItem"""
    stafflist = StaffListFactory.create(
        author=UserFactory.create(), privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    update_editor_group(user, is_editor)
    client.force_login(user)

    data = {"content_type": "course", "object_id": course.id}

    resp = client.post(
        reverse("stafflistitems-list", args=[stafflist.id]), data=data, format="json"
    )
    assert resp.status_code == (201 if is_editor else 403)
    if resp.status_code == 201:
        assert resp.json().get("object_id") == course.id
        mock_staff_list_index.upsert_staff_list.assert_called_once_with(stafflist.id)


def test_staff_list_items_endpoint_create_item_bad_data(client, user):
    """Test stafflistitems endpoint for creating a StaffListItem w/bad data"""
    stafflist = StaffListFactory.create(
        author=UserFactory.create(), privacy_level=PrivacyLevel.public.value
    )
    course = CourseFactory.create()

    update_editor_group(user, True)
    client.force_login(user)

    data = {"content_type": "bad_content", "object_id": course.id}

    resp = client.post(
        reverse("stafflistitems-list", args=[stafflist.id]), data=data, format="json"
    )
    assert resp.status_code == 400
    assert resp.json() == {
        "non_field_errors": ["Incorrect object type bad_content"],
        "error_type": "ValidationError",
    }


@pytest.mark.parametrize("is_editor, position", [[True, 0], [True, 2], [False, 1]])
def test_staff_list_items_endpoint_update_item(
    mock_staff_list_index, client, user, is_editor, position
):
    """Test stafflistitems endpoint for updating StaffListItem positions"""
    topics = CourseTopicFactory.create_batch(3)
    stafflist = StaffListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value,
        topics=topics,
    )
    list_item_1 = StaffListItemFactory.create(staff_list=stafflist, position=0)
    list_item_2 = StaffListItemFactory.create(staff_list=stafflist, position=1)
    list_item_3 = StaffListItemFactory.create(staff_list=stafflist, position=2)

    update_editor_group(user, is_editor)
    client.force_login(user)

    data = {"position": position}

    resp = client.patch(
        reverse("stafflistitems-detail", args=[stafflist.id, list_item_2.id]),
        data=data,
        format="json",
    )
    assert resp.status_code == (200 if is_editor else 403)
    if resp.status_code == 200:
        assert resp.json()["position"] == position
        for item, expected_pos in (
            [list_item_3, 1 if position == 2 else 2],
            [list_item_1, 0 if position == 2 else 1],
            [list_item_2, position],
        ):
            item.refresh_from_db()
            assert item.position == expected_pos
            mock_staff_list_index.upsert_staff_list.assert_called_once_with(
                stafflist.id
            )


def test_staff_list_items_endpoint_update_items_wrong_list(client, user):
    """Verify that trying an update via stafflistitems api in wrong list fails"""
    stafflist = StaffListFactory.create(
        author=UserFactory.create(), privacy_level=PrivacyLevel.public.value
    )
    list_item_incorrect = StaffListItemFactory.create()

    update_editor_group(user, True)
    client.force_login(user)

    data = {"id": list_item_incorrect.id, "position": 44}

    resp = client.patch(
        reverse("stafflistitems-detail", args=[stafflist.id, list_item_incorrect.id]),
        data=data,
        format="json",
    )
    assert resp.status_code == 404


@pytest.mark.parametrize("num_items", [1, 2])
@pytest.mark.parametrize("is_editor", [True, False])
def test_staff_list_items_endpoint_delete_items(
    mock_staff_list_index, client, user, is_editor, num_items
):
    """Test stafflistitems endpoint for deleting StaffListItems"""
    stafflist = StaffListFactory.create(
        author=UserFactory.create(), privacy_level=PrivacyLevel.public.value
    )
    list_items = sorted(
        StaffListItemFactory.create_batch(num_items, staff_list=stafflist),
        key=lambda item: item.id,
    )

    update_editor_group(user, is_editor)
    client.force_login(user)

    resp = client.delete(
        reverse("stafflistitems-detail", args=[stafflist.id, list_items[0].id]),
        format="json",
    )
    assert resp.status_code == (204 if is_editor else 403)
    if is_editor:
        assert mock_staff_list_index.delete_staff_list_view.call_count == (
            0 if num_items == 2 else 1
        )
        assert mock_staff_list_index.upsert_staff_list_view.call_count == (
            1 if num_items == 2 else 0
        )


@pytest.mark.parametrize("is_editor", [True, False])
def test_staff_list_endpoint_delete(mock_staff_list_index, client, user, is_editor):
    """Test stafflist endpoint for deleting a StaffList"""
    stafflist = StaffListFactory.create(
        author=UserFactory.create(), privacy_level=PrivacyLevel.public.value
    )

    update_editor_group(user, is_editor)
    client.force_login(user)

    resp = client.delete(reverse("stafflists-detail", args=[stafflist.id]))
    assert resp.status_code == (204 if is_editor else 403)
    assert StaffList.objects.filter(id=stafflist.id).exists() is not is_editor
    assert mock_staff_list_index.delete_staff_list_view.call_count == (
        1 if is_editor else 0
    )
