"""Permissions for channels_fields"""
import logging

from django.http import Http404
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from channels_fields.api import is_moderator
from channels_fields.models import FieldChannel
from open_discussions.permissions import is_staff_user

log = logging.getLogger()


def field_exists(view: APIView) -> bool:
    """
    Return True if a FieldChannel object exists for a field_name in the view, or there is no field name.
    Raises 404 if the FieldChannel does not exist.
    """
    field_name = view.kwargs.get("field_name", None)
    if not field_name or FieldChannel.objects.filter(name=field_name).exists():
        return True
    raise Http404()


def is_field_moderator(request: Request, view: APIView) -> bool:
    """
    Determine if the user is a moderator for a field channel (or a staff user)
    """
    return is_moderator(request.user, view.kwargs.get("field_name", None))


class FieldModeratorPermissions(BasePermission):
    """
    Check if a user is a moderator
    """

    def has_permission(self, request, view):
        return field_exists(view) and (
            is_staff_user(request) or is_field_moderator(request, view)
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class HasFieldPermission(BasePermission):
    """Permission to view/modify/create FieldChannel objects"""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if request.method == "POST":
            # Only staff can create new fields
            return request.user.is_staff
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        elif request.method == "DELETE":
            return request.user.is_staff
        else:
            return is_field_moderator(request, view)
