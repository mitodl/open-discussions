"""
course_catalog permissions tests
"""

import pytest
from django.contrib.auth.models import AnonymousUser

from course_catalog.constants import PrivacyLevel
from course_catalog.factories import UserListFactory
from course_catalog.permissions import HasUserListPermissions
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
