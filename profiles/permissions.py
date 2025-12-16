"""Permissions for profiles"""
from rest_framework import permissions

from open_discussions.permissions import is_admin_user


def is_owner_or_privileged_user(obj_user, request):
    """Returns True if the given user matches the requesting user, or the given user is superuser/staff"""
    return (
        obj_user == request.user or request.user.is_superuser or is_admin_user(request)
    )


class HasEditPermission(permissions.BasePermission):
    """Only profile's User, or Jwt/Staff, or superuser has permission to edit a profile."""

    def has_object_permission(self, request, view, obj):
        """Only allow editing for owner of the profile, jwt_staff, or superusers"""
        if request.method in permissions.SAFE_METHODS:
            return True

        return is_owner_or_privileged_user(obj.user, request)


class HasSiteEditPermission(permissions.BasePermission):
    """Permission class indicating the requesting user created a given UserWebsite or
    is a superuser/staff user.
    """

    def has_object_permission(
        self, request, view, obj
    ):  # pylint: disable=missing-docstring
        if request.method in permissions.SAFE_METHODS:
            return True

        return is_owner_or_privileged_user(obj.profile.user, request)
