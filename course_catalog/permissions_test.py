"""
course_catalog permissions tests
"""
import pytest
from django.contrib.auth.models import AnonymousUser
from django.http import Http404

from course_catalog.constants import PrivacyLevel
from course_catalog.factories import (
    StaffListFactory,
    StaffListItemFactory,
    UserListFactory,
    UserListItemFactory,
)
from course_catalog.permissions import (
    HasStaffListItemPermissions,
    HasStaffListPermission,
    HasUserListItemPermissions,
    HasUserListPermissions,
    is_staff_list_editor,
)
from course_catalog.utils import update_editor_group
from open_discussions.factories import UserFactory


@pytest.fixture(autouse=True)
def drf_settings(settings):
    """Default drf prefix setting"""
    settings.DRF_NESTED_PARENT_LOOKUP_PREFIX = ""


@pytest.mark.parametrize("is_safe", [True, False])
@pytest.mark.parametrize("is_anonymous", [True, False])
def test_userlist_permissions(mocker, user, is_safe, is_anonymous):
    """
    HasUserListPermissions.has_permission should always return True for safe (GET) requests,
    should return False for anonymous users if request is a POST
    """

    request = mocker.MagicMock(
        method="GET" if is_safe else "POST",
        user=(AnonymousUser() if is_anonymous else user),
    )
    assert HasUserListPermissions().has_permission(request, mocker.MagicMock()) is (
        is_safe or not is_anonymous
    )


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_author", [True, False])
def test_userlist_object_permissions(mocker, user, is_public, is_author):
    """
    HasUserListPermissions.has_object_permission should return correct permission depending
    on privacy level and author.
    """
    userlist = UserListFactory.create(
        author=user,
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    requester = user if is_author else UserFactory.create()
    request = mocker.MagicMock(method="GET", user=requester)
    assert HasUserListPermissions().has_object_permission(
        request, mocker.MagicMock(), userlist
    ) is (is_public or is_author)


def test_userlistitems_permissions_404(mocker, user):
    """
    HasUserListItemPermissions.has_permission should return a 404 if the userlist doesn't exist.
    """
    request = mocker.MagicMock(method="GET", user=user)

    view = mocker.MagicMock(kwargs={"user_list_id": 99999})
    with pytest.raises(Http404):
        HasUserListItemPermissions().has_permission(request, view)


@pytest.mark.parametrize("is_author", [True, False])
@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_safe", [True, False])
def test_userlistitems_permissions(mocker, user, is_safe, is_public, is_author):
    """
    HasUserListItemPermissions.has_permission should return correct permission depending
    on privacy level, author, and request method.
    """
    userlist = UserListFactory.create(
        author=user if is_author else UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )
    request = mocker.MagicMock(method="GET" if is_safe else "POST", user=user)

    view = mocker.MagicMock(kwargs={"user_list_id": userlist.id})
    assert HasUserListItemPermissions().has_permission(request, view) is (
        is_author or (is_safe and is_public)
    )


@pytest.mark.parametrize("is_safe", [True, False])
@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_author", [True, False])
def test_userlistitems_object_permissions(mocker, user, is_public, is_author, is_safe):
    """
    HasUserListItemPermissions.has_object_permission should return correct permission depending
    on privacy level, author, and request method.
    """
    userlist = UserListFactory.create(
        author=user,
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )
    userlist_item = UserListItemFactory.create(user_list=userlist)

    request = mocker.MagicMock(
        method="GET" if is_safe else "POST",
        user=(user if is_author else UserFactory.create()),
    )
    view = mocker.MagicMock(kwargs={"user_list_id": userlist.id})
    assert HasUserListItemPermissions().has_object_permission(
        request, view, userlist_item
    ) is (is_author or (is_safe and is_public))


@pytest.mark.parametrize("action", ["favorite", "unfavorite", ""])
@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_author", [True, False])
def test_userlist_favorite_permissions(mocker, user, is_public, is_author, action):
    """
    HasUserListPermissions.has_object_permission should return correct permission depending
    on privacy level and author when favoriting or unfavoriting.
    """
    userlist = UserListFactory.create(
        author=user,
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    request = mocker.MagicMock(
        method="POST", user=(user if is_author else UserFactory.create())
    )
    assert HasUserListPermissions().has_object_permission(
        request, mocker.MagicMock(action=action), userlist
    ) is ((is_public and "favorite" in action) or is_author)


@pytest.mark.parametrize("is_safe", [True, False])
@pytest.mark.parametrize("is_anonymous", [True, False])
@pytest.mark.parametrize("is_editor", [True, False])
def test_stafflist_permissions(mocker, user, is_safe, is_anonymous, is_editor):
    """
    HasStaffListPermissions.has_permission should always return True for safe (GET) requests,
    should return False for anonymous users if request is a POST
    """
    update_editor_group(user, (is_editor and not is_anonymous))
    request = mocker.MagicMock(
        method="GET" if is_safe else "POST",
        user=(AnonymousUser() if is_anonymous else user),
    )
    assert is_staff_list_editor(request) is (is_editor and not is_anonymous)
    assert HasStaffListPermission().has_permission(request, mocker.MagicMock()) is (
        is_safe or (is_editor and not is_anonymous)
    )


@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_editor", [True, False])
def test_stafflist_object_permissions(mocker, user, is_public, is_editor):
    """
    HasStaffListPermissions.has_object_permission should return correct permission depending
    on privacy level and editor group membership.
    """
    stafflist = StaffListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )

    update_editor_group(user, is_editor)

    request = mocker.MagicMock(method="GET", user=user)
    assert HasStaffListPermission().has_object_permission(
        request, mocker.MagicMock(), stafflist
    ) is (is_public or is_editor)


def test_stafflistitems_permissions_404(mocker, user):
    """
    HasStaffListPermissions.has_permission should return a 404 if the stafflist doesn't exist.
    """
    request = mocker.MagicMock(method="GET", user=user)

    view = mocker.MagicMock(kwargs={"staff_list_id": 99999})
    with pytest.raises(Http404):
        HasStaffListItemPermissions().has_permission(request, view)


@pytest.mark.parametrize("is_editor", [True, False])
@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_safe", [True, False])
def test_stafflistitems_permissions(mocker, user, is_safe, is_public, is_editor):
    """
    HasUserListItemPermissions.has_permission should return correct permission depending
    on privacy level, author, and request method.
    """
    update_editor_group(user, is_editor)

    stafflist = StaffListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )
    request = mocker.MagicMock(method="GET" if is_safe else "POST", user=user)

    view = mocker.MagicMock(kwargs={"staff_list_id": stafflist.id})
    assert HasStaffListItemPermissions().has_permission(request, view) is (
        is_editor or (is_safe and is_public)
    )


@pytest.mark.parametrize("is_safe", [True, False])
@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_editor", [True, False])
def test_stafflistitems_object_permissions(mocker, user, is_public, is_editor, is_safe):
    """
    HasUserListItemPermissions.has_object_permission should return correct permission depending
    on privacy level, author, and request method.
    """
    stafflist = StaffListFactory.create(
        author=UserFactory.create(),
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )
    stafflist_item = StaffListItemFactory.create(staff_list=stafflist)

    update_editor_group(user, is_editor)
    request = mocker.MagicMock(
        method="GET" if is_safe else "POST",
        user=user,
    )
    view = mocker.MagicMock(kwargs={"staff_list_id": stafflist.id})
    assert HasStaffListItemPermissions().has_object_permission(
        request, view, stafflist_item
    ) is (is_editor or (is_safe and is_public))


@pytest.mark.parametrize("action", ["favorite", "unfavorite", ""])
@pytest.mark.parametrize("is_public", [True, False])
@pytest.mark.parametrize("is_editor", [True, False])
def test_stafflist_favorite_permissions(mocker, user, is_public, is_editor, action):
    """
    HasStaffListPermissions.has_object_permission should return correct permission depending
    on privacy level and author when favoriting or unfavoriting.
    """
    stafflist = StaffListFactory.create(
        author=user,
        privacy_level=PrivacyLevel.public.value
        if is_public
        else PrivacyLevel.private.value,
    )
    update_editor_group(user, is_editor)
    request = mocker.MagicMock(method="POST", user=user)
    assert HasStaffListPermission().has_object_permission(
        request, mocker.MagicMock(action=action), stafflist
    ) is ((is_public and "favorite" in action) or is_editor)
