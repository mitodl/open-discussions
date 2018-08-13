""" Permissions for profiles """
from rest_framework import permissions

from open_discussions.permissions import is_staff_user


class HasEditPermission(permissions.BasePermission):
    """
    Only profile's User, or Jwt/Staff, or superuser has permission to edit a profile.
    """

    def has_object_permission(self, request, view, obj):
        """
        Only allow editing for owner of the profile, jwt_staff, or superusers
        """
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.user == request.user or request.user.is_superuser or is_staff_user(request)
