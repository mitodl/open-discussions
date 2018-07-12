"""Tests for permissions"""
from django.contrib.auth.models import AnonymousUser
import pytest
from prawcore.exceptions import (
    Forbidden as PrawForbidden,
    Redirect as PrawRedirect,
)

from open_discussions import features
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    JwtIsStaffPermission,
    JwtIsStaffOrModeratorPermission,
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


@pytest.mark.parametrize('is_moderator', [
    True,
    False,
])
def test_staff_or_moderator(mocker, user, jwt_token, is_moderator):
    """
    Test that moderators are allowed or not
    """
    perm = JwtIsStaffOrModeratorPermission()
    request = mocker.Mock(auth=jwt_token, user=user)
    request.channel_api = mocker.patch('channels.api.Api').return_value
    request.channel_api.is_moderator.return_value = is_moderator
    view = mocker.Mock(kwargs=dict(channel_name='abc'))
    assert perm.has_permission(request, view) is is_moderator
    request.channel_api.is_moderator.assert_called_once_with('abc', user.username)


@pytest.mark.parametrize('exception_cls', [
    PrawRedirect,
    PrawForbidden,
])
def test_staff_or_moderator_exceptions(mocker, jwt_token, exception_cls):
    """
    Test that user is deemed not a moderator if praw raises a forbidden or redirect error
    """
    perm = JwtIsStaffOrModeratorPermission()
    request = mocker.Mock(auth=jwt_token)
    request.channel_api = mocker.patch('channels.api.Api').return_value
    request.channel_api.is_moderator.side_effect = exception_cls(mocker.MagicMock(headers={
        'location': '/'
    }))
    view = mocker.Mock(kwargs=dict(channel_name='abc'))
    assert perm.has_permission(request, view) is False


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


@pytest.mark.parametrize('method', ['GET', 'HEAD', 'OPTIONS', "POST", 'PUT'])
def test_anonymous_without_feature_flag(method, settings, mocker):
    """
    Test that anonymous users are rejected if the feature flag is off
    """
    settings.FEATURES[features.ANONYMOUS_ACCESS] = False
    perm = AnonymousAccessReadonlyPermission()
    request = mocker.Mock(user=AnonymousUser(), method=method)
    assert perm.has_permission(request, mocker.Mock()) is False


@pytest.mark.parametrize('method,result', [
    ('GET', True),
    ('HEAD', True),
    ('OPTIONS', True),
    ('POST', False),
    ('PUT', False),
])
def test_anonymous_readonly(method, result, settings, mocker):
    """
    Test that anonymous users are allowed for readonly verbs
    """
    settings.FEATURES[features.ANONYMOUS_ACCESS] = True
    perm = AnonymousAccessReadonlyPermission()
    request = mocker.Mock(user=AnonymousUser(), method=method)
    assert perm.has_permission(request, mocker.Mock()) is result


@pytest.mark.parametrize('method', ['GET', 'HEAD', 'OPTIONS', "POST", 'PUT'])
def test_not_anonymous(method, mocker):
    """
    Authenticated users are always allowed by this permission class
    """
    perm = AnonymousAccessReadonlyPermission()
    request = mocker.Mock(user=mocker.Mock(is_anonymous=False), method=method)
    assert perm.has_permission(request, mocker.Mock()) is True
