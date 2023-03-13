"""Tests for permissions"""
import pytest
from django.contrib.auth.models import AnonymousUser
from django.http import Http404
from prawcore.exceptions import Forbidden as PrawForbidden
from prawcore.exceptions import Redirect as PrawRedirect

from channels.models import Channel
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    ContributorPermissions,
    IsOwnSubscriptionOrAdminPermission,
    IsStaffModeratorOrReadonlyPermission,
    IsStaffOrModeratorPermission,
    IsStaffOrReadonlyPermission,
    IsStaffPermission,
    ModeratorPermissions,
    ObjectOnlyPermissions,
    channel_exists,
    channel_is_mod_editable,
    is_moderator,
    is_readonly,
    is_admin_user,
)

pytestmark = pytest.mark.usefixtures("mock_channel_exists")


@pytest.mark.parametrize(
    "method,result",
    [("GET", True), ("HEAD", True), ("OPTIONS", True), ("POST", False), ("PUT", False)],
)
def test_is_readonly(mocker, method, result):
    """is_readonly should return true for readonly HTTP verbs"""
    request = mocker.Mock(method=method)
    assert is_readonly(request) is result


@pytest.mark.parametrize("result", [True, False])
def test_is_moderator(user, mocker, result):
    """is_moderator should return True if the user is a moderator for the channel"""
    request = mocker.Mock(user=user)
    request.channel_api = mocker.patch("channels.api.Api").return_value
    request.channel_api.is_moderator.return_value = result
    channel_name = "abc"
    view = mocker.Mock(kwargs={"channel_name": channel_name})
    assert is_moderator(request, view) is result
    request.channel_api.is_moderator.assert_called_once_with(
        channel_name, user.username
    )


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


@pytest.mark.parametrize(
    "membership_is_managed,expected", [[True, False], [False, True], [None, False]]
)
def test_channel_is_mod_editable(
    mocker, membership_is_managed, expected, db
):  # pylint: disable=unused-argument
    """
    channel_is_mod_editable should be true if the channel exists and the membership is not managed by micromasters
    or another external server
    """
    channel_name = "abc"
    view = mocker.Mock(kwargs={"channel_name": channel_name})

    if membership_is_managed is not None:
        Channel.objects.create(
            name=channel_name, membership_is_managed=membership_is_managed
        )

    assert channel_is_mod_editable(view) is expected


@pytest.mark.parametrize("is_staff", [True, False])
def test_is_staff_permission(mocker, is_staff):
    """
    Test that IsStaffPermission checks that the user is a staff user
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_user_mock = mocker.patch(
        "open_discussions.permissions.is_admin_user",
        autospec=True,
        return_value=is_staff,
    )
    assert IsStaffPermission().has_permission(request, view) is is_staff
    is_staff_user_mock.assert_called_once_with(request)


@pytest.mark.parametrize(
    "is_staff,readonly,expected",
    [
        [True, True, True],
        [True, False, True],
        [False, True, True],
        [False, False, False],
    ],
)
def test_is_staff_or_readonly_permission(mocker, is_staff, readonly, expected):
    """
    Test that staff users or readonly verbs are allowed
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_user_mock = mocker.patch(
        "open_discussions.permissions.is_admin_user",
        autospec=True,
        return_value=is_staff,
    )
    is_readonly_mock = mocker.patch(
        "open_discussions.permissions.is_readonly", autospec=True, return_value=readonly
    )
    assert IsStaffOrReadonlyPermission().has_permission(request, view) is expected
    if is_staff_user_mock.called:
        is_staff_user_mock.assert_called_once_with(request)
    is_readonly_mock.assert_called_once_with(request)


@pytest.mark.parametrize(
    "is_staff,moderator,expected",
    [
        [True, True, True],
        [True, False, True],
        [False, True, True],
        [False, False, False],
    ],
)
def test_is_staff_or_moderator_permission(mocker, is_staff, moderator, expected):
    """
    Test that staff users or moderators are allowed
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_user_mock = mocker.patch(
        "open_discussions.permissions.is_admin_user",
        autospec=True,
        return_value=is_staff,
    )
    is_moderator_mock = mocker.patch(
        "open_discussions.permissions.is_moderator",
        autospec=True,
        return_value=moderator,
    )
    assert IsStaffOrModeratorPermission().has_permission(request, view) is expected
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)
    is_staff_user_mock.assert_called_once_with(request)


@pytest.mark.parametrize("exception_cls", [PrawRedirect, PrawForbidden])
def test_is_staff_or_moderator_exceptions(mocker, user, exception_cls):
    """
    Test that user is deemed not a moderator if praw raises a forbidden or redirect error
    """
    perm = IsStaffOrModeratorPermission()
    request = mocker.Mock(user=user)
    request.channel_api = mocker.patch("channels.api.Api").return_value
    request.channel_api.is_moderator.side_effect = exception_cls(
        mocker.MagicMock(headers={"location": "/"})
    )
    view = mocker.Mock(kwargs=dict(channel_name="abc"))
    assert perm.has_permission(request, view) is False


@pytest.mark.parametrize(
    "is_staff,moderator,readonly,expected",
    [
        [True, True, True, True],
        [True, False, True, True],
        [False, True, True, True],
        [False, False, True, True],
        [True, True, False, True],
        [True, False, False, True],
        [False, True, False, True],
        [False, False, False, False],
    ],
)
def test_is_staff_moderator_or_readonly_permission(
    mocker, is_staff, moderator, readonly, expected
):
    """
    Test that staff users or moderators are allowed
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_user_mock = mocker.patch(
        "open_discussions.permissions.is_admin_user",
        autospec=True,
        return_value=is_staff,
    )
    is_moderator_mock = mocker.patch(
        "open_discussions.permissions.is_moderator",
        autospec=True,
        return_value=moderator,
    )
    is_readonly_mock = mocker.patch(
        "open_discussions.permissions.is_readonly", autospec=True, return_value=readonly
    )
    assert (
        IsStaffModeratorOrReadonlyPermission().has_permission(request, view) is expected
    )
    is_readonly_mock.assert_called_once_with(request)
    if is_staff_user_mock.called:
        is_staff_user_mock.assert_called_once_with(request)
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)


@pytest.mark.parametrize("exception_cls", [PrawRedirect, PrawForbidden])
def test_is_staff_moderator_or_readonly_exceptions(mocker, user, exception_cls):
    """
    Test that user is deemed not a moderator if praw raises a forbidden or redirect error
    """
    perm = IsStaffModeratorOrReadonlyPermission()
    request = mocker.Mock(user=user)
    request.channel_api = mocker.patch("channels.api.Api").return_value
    request.channel_api.is_moderator.side_effect = exception_cls(
        mocker.MagicMock(headers={"location": "/"})
    )
    view = mocker.Mock(kwargs=dict(channel_name="abc"))
    assert perm.has_permission(request, view) is False


@pytest.mark.parametrize(
    "logged_in_username,req_body_username,url_kwarg_username,expected",
    [
        ["user1", "user1", None, True],
        ["user1", None, "user1", True],
        ["user1", "user1", None, True],
        ["otheruser", "user1", None, False],
        ["otheruser", None, "user1", False],
        ["user1", None, None, False],
    ],
)
def test_is_own_subscription_permission(
    mocker, logged_in_username, req_body_username, url_kwarg_username, expected
):
    """
    Test that IsOwnSubscriptionOrAdminPermission returns True if the user is adding/deleting
    their own resource
    """
    view = mocker.Mock(kwargs={"subscriber_name": url_kwarg_username})
    request = mocker.Mock(
        user=mocker.Mock(username=logged_in_username),
        data={"subscriber_name": req_body_username} if req_body_username else {},
    )
    mocker.patch("open_discussions.permissions.is_admin_user", return_value=False)
    mocker.patch("open_discussions.permissions.is_moderator", return_value=False)
    mocker.patch("open_discussions.permissions.is_readonly", return_value=False)
    assert (
        IsOwnSubscriptionOrAdminPermission().has_permission(request, view) is expected
    )


def test_contributor_permission_self_delete(mocker):
    """
    Test that users can delete their own contributor status
    """
    mocker.patch("open_discussions.permissions.is_admin_user", return_value=False)
    mocker.patch("open_discussions.permissions.is_moderator", return_value=False)
    username = "user1"
    request, view = mocker.Mock(), mocker.Mock()
    request.method = "DELETE"
    request.user.username = username
    view.kwargs = {"contributor_name": username}
    assert ContributorPermissions().has_permission(request, view) is True


# This is essentially is_staff or (moderator and (mod_editable or readonly))
@pytest.mark.parametrize(
    "is_staff, moderator, mod_editable, readonly, expected",
    [
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
        [False, True, False, False, False],
        [False, False, True, True, False],
        [False, False, True, False, False],
        [False, False, False, True, False],
        [False, False, False, False, False],
    ],
)  # pylint: disable=too-many-arguments
def test_contributor_permission(  # pylint:disable=unused-argument,too-many-arguments
    mocker, is_staff, moderator, mod_editable, readonly, expected
):
    """
    Test who can view and edit via the contributor REST API
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_staff_user_mock = mocker.patch(
        "open_discussions.permissions.is_admin_user",
        autospec=True,
        return_value=is_staff,
    )
    is_moderator_mock = mocker.patch(
        "open_discussions.permissions.is_moderator",
        autospec=True,
        return_value=moderator,
    )
    channel_is_mod_editable_mock = mocker.patch(
        "open_discussions.permissions.channel_is_mod_editable",
        autospec=True,
        return_value=mod_editable,
    )
    is_readonly_mock = mocker.patch(
        "open_discussions.permissions.is_readonly", autospec=True, return_value=readonly
    )
    assert ContributorPermissions().has_permission(request, view) is expected
    is_staff_user_mock.assert_called_once_with(request)
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)
    if channel_is_mod_editable_mock.called:
        channel_is_mod_editable_mock.assert_called_once_with(view)
    if is_readonly_mock.called:
        is_readonly_mock.assert_called_once_with(request)


@pytest.mark.parametrize(
    "readonly, is_staff, mod_editable, moderator, expected",
    [
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
    ],
)  # pylint: disable=too-many-arguments
def test_moderator_permission(  # pylint:disable=unused-argument,too-many-arguments
    mocker, readonly, is_staff, mod_editable, moderator, expected
):
    """
    Test who can view and edit via the moderator REST API
    """
    request, view = mocker.Mock(), mocker.Mock()
    is_readonly_mock = mocker.patch(
        "open_discussions.permissions.is_readonly", autospec=True, return_value=readonly
    )
    is_staff_user_mock = mocker.patch(
        "open_discussions.permissions.is_admin_user",
        autospec=True,
        return_value=is_staff,
    )
    is_moderator_mock = mocker.patch(
        "open_discussions.permissions.is_moderator",
        autospec=True,
        return_value=moderator,
    )
    channel_is_mod_editable_mock = mocker.patch(
        "open_discussions.permissions.channel_is_mod_editable",
        autospec=True,
        return_value=mod_editable,
    )
    assert ModeratorPermissions().has_permission(request, view) is expected
    is_readonly_mock.assert_called_once_with(request)
    if is_staff_user_mock.called:
        is_staff_user_mock.assert_called_once_with(request)
    if is_moderator_mock.called:
        is_moderator_mock.assert_called_once_with(request, view)
    if channel_is_mod_editable_mock.called:
        channel_is_mod_editable_mock.assert_called_once_with(view)


@pytest.mark.parametrize(
    "method,result",
    [("GET", True), ("HEAD", True), ("OPTIONS", True), ("POST", False), ("PUT", False)],
)
def test_anonymous_readonly(method, result, mocker):
    """
    Test that anonymous users are allowed for readonly verbs
    """
    perm = AnonymousAccessReadonlyPermission()
    request = mocker.Mock(user=AnonymousUser(), method=method)
    assert perm.has_permission(request, mocker.Mock()) is result


@pytest.mark.parametrize("method", ["GET", "HEAD", "OPTIONS", "POST", "PUT"])
def test_not_anonymous(method, mocker):
    """
    Authenticated users are always allowed by this permission class
    """
    perm = AnonymousAccessReadonlyPermission()
    request = mocker.Mock(user=mocker.Mock(is_anonymous=False), method=method)
    assert perm.has_permission(request, mocker.Mock()) is True


@pytest.mark.parametrize(
    "name,raises_404", [["real", False], ["fake", True], [None, False]]
)
@pytest.mark.django_db
def test_channel_exists(mocker, name, raises_404):
    """
    channel_exists function should raise an Http404 if channel name is not None and doesn't exist
    """
    channel_view = mocker.Mock(kwargs={"channel_name": name})
    if name and not raises_404:
        Channel.objects.create(name=name)
    if raises_404:
        with pytest.raises(Http404):
            channel_exists(channel_view)
    else:
        assert channel_exists(channel_view)


def test_object_only_permissions(mocker):
    """Checks that ObjectOnlyPermissions.has_permission() returns True"""
    perm = ObjectOnlyPermissions()
    request = mocker.Mock(user=mocker.Mock(is_anonymous=False), method="PUT")
    assert perm.has_permission(request, mocker.Mock()) is True
