"""Custom permissions"""
import jwt
from prawcore.exceptions import (
    Forbidden as PrawForbidden,
    Redirect as PrawRedirect,
)
from rest_framework import permissions
from rest_framework_jwt.settings import api_settings

from open_discussions import features

from channels.models import Channel


def is_staff_user(request):
    """
    Args:
        request (HTTPRequest): django request object

    Returns:
        bool: True if user is staff
    """
    if request.auth is None:
        if request.user and request.user.is_authenticated:
            return request.user.is_staff

        return False

    jwt_decode_handler = api_settings.JWT_DECODE_HANDLER

    try:
        payload = jwt_decode_handler(request.auth)
    except jwt.InvalidTokenError:
        return False

    return 'roles' in payload and 'staff' in payload['roles']


def is_moderator(request, view):
    """
    Helper function to check if a user is a moderator

    Args:
        request (HTTPRequest): django request object
        view (APIView): a DRF view object

    Returns:
        bool: True if user is moderator on the channel
    """
    user_api = request.channel_api
    channel_name = view.kwargs.get('channel_name', None)
    try:
        return (
            channel_name and
            not request.user.is_anonymous and
            user_api.is_moderator(channel_name, request.user.username)
        )
    except PrawForbidden:
        # User was forbidden to list moderators so they are most certainly not one
        return False
    except PrawRedirect:
        # if a redirect occurred, that means the user doesn't have any permissions
        # for the subreddit and most definitely is not a moderator
        return False


def channel_is_mod_editable(view):
    """
    Helper function to check that a channel can be edited by a moderator on discussions.

    Args:
        view (APIView): a DRF view object

    Returns:
        bool:
            True if the channel can be edited by a moderator. False if the channel does not exist or can only
            be edited by a staff user from another server.
    """
    channel_name = view.kwargs.get('channel_name')
    managed = Channel.objects.filter(name=channel_name).values_list('membership_is_managed', flat=True).first()
    # None means the channel does not exist, True means it does but we shouldn't edit it via REST API
    return managed is False


def is_readonly(request):
    """
    Returns True if the request uses a readonly verb

    Args:
        request (HTTPRequest): A request

    Returns:
        bool: True if the request method is readonly
    """
    return request.method in permissions.SAFE_METHODS


class JwtIsStaffPermission(permissions.BasePermission):
    """Checks the JWT payload for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role"""
        return is_staff_user(request)


class IsStaffOrReadonlyPermission(permissions.BasePermission):
    """Checks the JWT payload for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role or if the request is readonly"""
        return is_readonly(request) or is_staff_user(request)


class IsStaffOrModeratorPermission(permissions.BasePermission):
    """Checks that the user is either staff or a moderator"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role or is a moderator"""
        return is_staff_user(request) or is_moderator(request, view)


class IsStaffModeratorOrReadonlyPermission(permissions.BasePermission):
    """Checks that the user is either staff, a moderator, or performing a readonly operation"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role, is a moderator, or the request is readonly"""
        return is_readonly(request) or is_staff_user(request) or is_moderator(request, view)


class ContributorPermissions(permissions.BasePermission):
    """
    Only staff and moderators should be able to see and edit the list of contributors
    """
    def has_permission(self, request, view):
        return is_staff_user(request) or (
            (
                channel_is_mod_editable(view) or is_readonly(request)
            ) and is_moderator(request, view)
        )


class ModeratorPermissions(permissions.BasePermission):
    """
    All users should be able to see a list of moderators. Only staff and moderators should be able to edit it.
    """
    def has_permission(self, request, view):
        return is_readonly(request) or is_staff_user(request) or (
            channel_is_mod_editable(view) and is_moderator(request, view)
        )


class AnonymousAccessReadonlyPermission(permissions.BasePermission):
    """Checks that the user is authenticated or is allowed anonymous access"""

    def has_permission(self, request, view):
        """Is the user authenticated or allowed anonymous access?"""
        if not request.user.is_anonymous:
            return True

        if not is_readonly(request):
            return False

        return features.is_enabled(features.ANONYMOUS_ACCESS)
