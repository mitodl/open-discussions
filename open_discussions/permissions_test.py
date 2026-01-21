"""Tests for permissions"""
import pytest
from django.contrib.auth.models import AnonymousUser

from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    ObjectOnlyPermissions,
    is_admin_user,
    is_readonly,
)


@pytest.mark.parametrize(
    "method,result",
    [
        ("GET", True),
        ("HEAD", True),
        ("OPTIONS", True),
        ("POST", False),
        ("PUT", False),
    ],
)
def test_is_readonly(mocker, method, result):
    """is_readonly should return true for readonly HTTP verbs"""
    request = mocker.Mock(method=method)
    assert is_readonly(request) is result


@pytest.mark.parametrize(
    "has_user, is_staff, is_super, expected",
    [
        [False, False, False, False],
        [True, False, False, False],
        [True, True, False, True],
        [True, False, True, True],
    ],
)
def test_is_staff_user(
    mocker, user, staff_user, has_user, is_staff, is_super, expected
):  # pylint: disable=too-many-arguments
    """is_admin_user should return True if a valid JWT is provided"""
    request = mocker.Mock()
    if has_user:
        request.user = staff_user if is_staff else user
        request.user.is_superuser = is_super
    else:
        request.user = None
    assert is_admin_user(request) is expected


@pytest.mark.parametrize("method", ["GET", "HEAD", "OPTIONS", "POST", "PUT"])
def test_anonymous_readonly(mocker, method):
    """Test that AnonymousAccessReadonlyPermission allows anonymous readonly access"""
    request = mocker.Mock()
    request.user = AnonymousUser()
    request.method = method
    view = mocker.Mock()
    expected = method in ["GET", "HEAD", "OPTIONS"]
    assert AnonymousAccessReadonlyPermission().has_permission(request, view) is expected


@pytest.mark.parametrize("method", ["GET", "HEAD", "OPTIONS", "POST", "PUT"])
def test_not_anonymous(mocker, user, method):
    """Test that AnonymousAccessReadonlyPermission allows all requests for authenticated users"""
    request, view = mocker.Mock(user=user), mocker.Mock()
    request.method = method
    assert AnonymousAccessReadonlyPermission().has_permission(request, view) is True


def test_object_only_permissions(mocker):
    """Test that ObjectOnlyPermissions ignores model-level permissions"""
    request, view = mocker.Mock(), mocker.Mock()
    assert ObjectOnlyPermissions().has_permission(request, view) is True
