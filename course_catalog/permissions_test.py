"""
course_catalog permissions tests
"""

import pytest
from django.contrib.auth.models import AnonymousUser

from course_catalog.constants import PrivacyLevel
from course_catalog.factories import UserListFactory, UserListCourseFactory
from course_catalog.permissions import (
    HasUserListPermissions,
    HasUserListItemPermissions,
)
from open_discussions.factories import UserFactory


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

    request = mocker.MagicMock(
        method="GET", user=(user if is_author else UserFactory.create())
    )
    assert HasUserListPermissions().has_object_permission(
        request, mocker.MagicMock(), userlist
    ) is (is_public or is_author)


@pytest.mark.parametrize("has_list", [True, False])
@pytest.mark.parametrize("is_author", [True, False])
def test_userlistitem_permissions(mocker, user, has_list, is_author):
    """
    HasUserListItemPermissions.has_permission should return True if userlist is None or belongs to user
    """
    userlist = UserListFactory.create(author=user)
    data = {"user_list": userlist.id} if has_list else {}

    request = mocker.MagicMock(
        method="POST", user=(user if is_author else UserFactory.create()), data=data
    )
    assert HasUserListItemPermissions().has_permission(request, mocker.MagicMock()) is (
        is_author or not has_list
    )


@pytest.mark.parametrize("is_author", [True, False])
def test_userlistitem_object_permissions(mocker, user, is_author):
    """
    HasUserListItemPermissions.has_object_permission should return True only if the item belongs to user
    """
    user_list = UserListFactory.create(author=user)
    item = UserListCourseFactory.create(user_list=user_list, position=1)

    request = mocker.MagicMock(
        method="PATCH", user=(user if is_author else UserFactory.create())
    )
    assert (
        HasUserListItemPermissions().has_object_permission(
            request, mocker.MagicMock(), item
        )
        is is_author
    )
