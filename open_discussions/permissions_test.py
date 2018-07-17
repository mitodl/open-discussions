"""Tests for permissions"""
from django.contrib.auth.models import AnonymousUser
import pytest
from prawcore.exceptions import (
    Forbidden as PrawForbidden,
    Redirect as PrawRedirect,
)

from channels.models import Channel
from open_discussions import features
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    ContributorPermissions,
    JwtIsStaffPermission,
    JwtIsStaffOrModeratorPermission,
    JwtIsStaffOrReadonlyPermission,
    JwtIsStaffModeratorOrReadonlyPermission,
    ModeratorPermissions,
    channel_is_mod_editable,
    is_readonly,
    is_moderator,
    is_staff_jwt,
)


@pytest.mark.parametrize('method,result', [
    ('GET', True),
    ('HEAD', True),
    ('OPTIONS', True),
    ('POST', False),
    ('PUT', False),
])
def test_is_readonly(mocker, method, result):
    """is_readonly should return true for readonly HTTP verbs"""
    request = mocker.Mock(method=method)
    assert is_readonly(request) is result


@pytest.mark.parametrize('result', [True, False])
def test_is_moderator(user, mocker, result):
    """is_moderator should return True if the user is a moderator for the channel"""
    request = mocker.Mock(user=user)
    request.channel_api = mocker.patch('channels.api.Api').return_value
    request.channel_api.is_moderator.return_value = result
    channel_name = 'abc'
    view = mocker.Mock(kwargs={'channel_name': channel_name})
    assert is_moderator(request, view) is result
    request.channel_api.is_moderator.assert_called_once_with(channel_name, user.username)


@pytest.mark.parametrize('result', [True, False])
def test_is_staff_jwt(mocker, staff_jwt_token, result):
    """is_staff_jwt should return True if a valid JWT is provided"""
    auth_kwargs = {'auth': staff_jwt_token} if result else {}
    request = mocker.Mock(**auth_kwargs)
    assert is_staff_jwt(request) is result


@pytest.mark.parametrize('membership_is_managed,expected', [
    [True, False],
    [False, True],
    [None, False]
])
def test_channel_is_mod_editable(mocker, membership_is_managed, expected, db):  # pylint: disable=unused-argument
    """
    channel_is_mod_editable should be true if the channel exists and the membership is not managed by micromasters
    or another external server
    """
    channel_name = 'abc'
    view = mocker.Mock(kwargs={'channel_name': channel_name})

    if membership_is_managed is not None:
        Channel.objects.create(name=channel_name, membership_is_managed=membership_is_managed)

    assert channel_is_mod_editable(view) is expected


@pytest.mark.parametrize('is_staff', [True, False])
def test_is_staff_permission(mocker, is_staff):
    """
    Test that JwtIsStaffPermission checks that the user is a staff user
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_jwt_mock = mocker.patch('open_discussions.permissions.is_staff_jwt', autospec=True, return_value=is_staff)
    assert JwtIsStaffPermission().has_permission(request, view) is is_staff
    is_staff_jwt_mock.assert_called_once_with(request)


@pytest.mark.parametrize('is_staff,readonly,expected', [
    [True, True, True],
    [True, False, True],
    [False, True, True],
    [False, False, False],
])
def test_is_staff_or_readonly_permission(mocker, is_staff, readonly, expected):
    """
    Test that staff users or readonly verbs are allowed
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_jwt_mock = mocker.patch('open_discussions.permissions.is_staff_jwt', autospec=True, return_value=is_staff)
    is_readonly_mock = mocker.patch(
        'open_discussions.permissions.is_readonly', autospec=True, return_value=readonly
    )
    assert JwtIsStaffOrReadonlyPermission().has_permission(request, view) is expected
    if is_staff_jwt_mock.called:
        is_staff_jwt_mock.assert_called_once_with(request)
    is_readonly_mock.assert_called_once_with(request)


@pytest.mark.parametrize('is_staff,moderator,expected', [
    [True, True, True],
    [True, False, True],
    [False, True, True],
    [False, False, False],
])
def test_is_staff_or_moderator_permission(mocker, is_staff, moderator, expected):
    """
    Test that staff users or moderators are allowed
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_jwt_mock = mocker.patch('open_discussions.permissions.is_staff_jwt', autospec=True, return_value=is_staff)
    is_moderator_mock = mocker.patch(
        'open_discussions.permissions.is_moderator', autospec=True, return_value=moderator
    )
    assert JwtIsStaffOrModeratorPermission().has_permission(request, view) is expected
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)
    is_staff_jwt_mock.assert_called_once_with(request)


@pytest.mark.parametrize('exception_cls', [
    PrawRedirect,
    PrawForbidden,
])
def test_is_staff_or_moderator_exceptions(mocker, jwt_token, exception_cls):
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


@pytest.mark.parametrize('is_staff,moderator,readonly,expected', [
    [True, True, True, True],
    [True, False, True, True],
    [False, True, True, True],
    [False, False, True, True],
    [True, True, False, True],
    [True, False, False, True],
    [False, True, False, True],
    [False, False, False, False],
])
def test_is_staff_moderator_or_readonly_permission(mocker, is_staff, moderator, readonly, expected):
    """
    Test that staff users or moderators are allowed
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_jwt_mock = mocker.patch('open_discussions.permissions.is_staff_jwt', autospec=True, return_value=is_staff)
    is_moderator_mock = mocker.patch(
        'open_discussions.permissions.is_moderator', autospec=True, return_value=moderator
    )
    is_readonly_mock = mocker.patch(
        'open_discussions.permissions.is_readonly', autospec=True, return_value=readonly
    )
    assert JwtIsStaffModeratorOrReadonlyPermission().has_permission(request, view) is expected
    is_readonly_mock.assert_called_once_with(request)
    if is_staff_jwt_mock.called:
        is_staff_jwt_mock.assert_called_once_with(request)
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)


@pytest.mark.parametrize('exception_cls', [
    PrawRedirect,
    PrawForbidden,
])
def test_is_staff_moderator_or_readonly_exceptions(mocker, jwt_token, exception_cls):
    """
    Test that user is deemed not a moderator if praw raises a forbidden or redirect error
    """
    perm = JwtIsStaffModeratorOrReadonlyPermission()
    request = mocker.Mock(auth=jwt_token)
    request.channel_api = mocker.patch('channels.api.Api').return_value
    request.channel_api.is_moderator.side_effect = exception_cls(mocker.MagicMock(headers={
        'location': '/'
    }))
    view = mocker.Mock(kwargs=dict(channel_name='abc'))
    assert perm.has_permission(request, view) is False


@pytest.mark.parametrize('is_staff, mod_editable, moderator, expected', [
    [True, True, True, True],
    [True, True, False, True],
    [True, False, True, True],
    [True, False, False, True],
    [False, True, True, True],
    [False, True, False, False],
    [False, False, True, False],
    [False, False, False, False],
])
def test_contributor_permission(mocker, is_staff, mod_editable, moderator, expected):
    """
    Test who can view and edit via the contributor REST API
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_jwt_mock = mocker.patch('open_discussions.permissions.is_staff_jwt', autospec=True, return_value=is_staff)
    is_moderator_mock = mocker.patch(
        'open_discussions.permissions.is_moderator', autospec=True, return_value=moderator
    )
    channel_is_mod_editable_mock = mocker.patch(
        'open_discussions.permissions.channel_is_mod_editable', autospec=True, return_value=mod_editable
    )
    assert ContributorPermissions().has_permission(request, view) is expected
    is_staff_jwt_mock.assert_called_once_with(request)
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)
    if channel_is_mod_editable_mock.called:
        channel_is_mod_editable_mock.assert_called_once_with(view)


@pytest.mark.parametrize('readonly, is_staff, mod_editable, moderator, expected', [
    [True, True, True, True, True],
    [True, True, True, False, True],
    [True, True, False, True, True],
    [True, True, False, False, True],
    [True, False, True, True, True],
    [True, False, True, False, True],
    [True, False, False, True, True],
    [True, False, False, False, True],
    [False, True, True, True, True],
    [False, True, True, False, True],
    [False, True, False, True, True],
    [False, True, False, False, True],
    [False, False, True, True, True],
    [False, False, True, False, False],
    [False, False, False, True, False],
    [False, False, False, False, False],
])  # pylint: disable=too-many-arguments
def test_moderator_permission(mocker, readonly, is_staff, mod_editable, moderator, expected):
    """
    Test who can view and edit via the moderator REST API
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_readonly_mock = mocker.patch('open_discussions.permissions.is_readonly', autospec=True, return_value=readonly)
    is_staff_jwt_mock = mocker.patch('open_discussions.permissions.is_staff_jwt', autospec=True, return_value=is_staff)
    is_moderator_mock = mocker.patch(
        'open_discussions.permissions.is_moderator', autospec=True, return_value=moderator
    )
    channel_is_mod_editable_mock = mocker.patch(
        'open_discussions.permissions.channel_is_mod_editable', autospec=True, return_value=mod_editable
    )
    assert ModeratorPermissions().has_permission(request, view) is expected
    is_readonly_mock.assert_called_once_with(request)
    if is_staff_jwt_mock.called:
        is_staff_jwt_mock.assert_called_once_with(request)
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)
    if channel_is_mod_editable_mock.called:
        channel_is_mod_editable_mock.assert_called_once_with(view)


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
