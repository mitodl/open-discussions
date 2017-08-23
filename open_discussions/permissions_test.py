"""Tests for permissions"""
import pytest

from open_discussions.permissions import (
    JwtIsStaffPermission,
    JwtIsStaffOrReadonlyPermission,
)


@pytest.mark.parametrize('perm', [
    JwtIsStaffPermission(),
    JwtIsStaffOrReadonlyPermission(),
])
def test_staff_anonymous_users_blocked(mocker, perm):
    """
    Test that anonymous users are not allowed
    """
    assert perm.has_permission(mocker.Mock(), mocker.Mock()) is False


def test_staff_deny_non_staff_user(mocker, jwt_token):
    """
    Test that nonstaff users are not allowed
    """
    perm = JwtIsStaffPermission()
    request = mocker.Mock(auth=jwt_token)
    assert perm.has_permission(request, mocker.Mock()) is False


@pytest.mark.parametrize('perm', [
    JwtIsStaffPermission(),
    JwtIsStaffOrReadonlyPermission(),
])
def test_staff_allow_staff_user(mocker, staff_jwt_token, perm):
    """
    Test that staff users are allowed
    """
    request = mocker.Mock(auth=staff_jwt_token)
    assert perm.has_permission(request, mocker.Mock()) is True


@pytest.mark.parametrize('method,result', [
    ('GET', True),
    ('HEAD', True),
    ('OPTIONS', True),
    ('POST', False),
    ('PUT', False),
])
def test_readonly(mocker, jwt_token, method, result):
    """
    Test that mutation HTTP verbs return appropriately if nonstaff
    """
    perm = JwtIsStaffOrReadonlyPermission()
    request = mocker.Mock(auth=jwt_token, method=method)
    assert perm.has_permission(request, mocker.Mock()) is result
