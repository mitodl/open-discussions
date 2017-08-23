"""Custom permissions"""
import jwt
from rest_framework import permissions
from rest_framework_jwt.settings import api_settings


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


class JwtIsStaffPermission(permissions.BasePermission):
    """Checks the JWT payload for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role"""
        return _is_staff_jwt(request)


class JwtIsStaffOrReadonlyPermission(permissions.BasePermission):
    """Checks the JWT payload for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role or if the request is readonly"""
        print(request.method)
        if request.method in permissions.SAFE_METHODS:
            return True

        return _is_staff_jwt(request)
