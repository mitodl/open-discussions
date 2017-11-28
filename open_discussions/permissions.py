"""Custom permissions"""
import jwt
import prawcore
from rest_framework import permissions
from rest_framework_jwt.settings import api_settings

from channels.api import Api


def _is_staff_jwt(request):
    """
    Args:
        request: django request object

    Returns:
        bool: True if user is staff
    """
    if request.auth is None:
        return False

    jwt_decode_handler = api_settings.JWT_DECODE_HANDLER

    try:
        payload = jwt_decode_handler(request.auth)
    except jwt.InvalidTokenError:
        return False

    return 'roles' in payload and 'staff' in payload['roles']


def _is_moderator(request, view):
    """
    Args:
        request: django request object
        view: a DRF view ooject

    Returns:
        bool: True if user is moderator on the channel
    """
    api = Api(request.user)
    channel_name = view.kwargs.get('channel_name', None)
    try:
        return channel_name and api.is_moderator(channel_name, request.user.username)
    except prawcore.exceptions.Redirect:
        # if a redirect occurred, that means the user doesn't have any permissions
        # for the subreddit and most definitely is not a moderator
        return False


class JwtIsStaffPermission(permissions.BasePermission):
    """Checks the JWT payload for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role"""
        return _is_staff_jwt(request)


class JwtIsStaffOrReadonlyPermission(permissions.BasePermission):
    """Checks the JWT payload for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role or if the request is readonly"""
        if request.method in permissions.SAFE_METHODS:
            return True

        return _is_staff_jwt(request)


class JwtIsStaffModeratorOrReadonlyPermission(permissions.BasePermission):
    """Checks that the user is either staff, a moderator, or performing a readonly operation"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role, is a moderator, or the request is readonly"""
        if request.method in permissions.SAFE_METHODS:
            return True

        return _is_staff_jwt(request) or _is_moderator(request, view)
