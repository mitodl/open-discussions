"""
course_catalog permissions
"""
from django.http import HttpRequest
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import SAFE_METHODS, BasePermission

from course_catalog.constants import GROUP_STAFF_LISTS_EDITORS, PrivacyLevel
from course_catalog.models import StaffList, UserList
from open_discussions.permissions import is_admin_user, is_readonly
from open_discussions.settings import DRF_NESTED_PARENT_LOOKUP_PREFIX


def is_staff_list_editor(request: HttpRequest) -> bool:
    """
    Determine if a request user is a member of the staff list editors group.

    Args:
        request (HttpRequest): The request

    Returns:
        bool: True if request user is a staff list editor
    """
    return (
        request.user is not None
        and request.user.groups.filter(name=GROUP_STAFF_LISTS_EDITORS).first()
        is not None
    )


class HasUserListPermissions(BasePermission):
    """Permission to view/modify UserLists"""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return not request.user.is_anonymous

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS or view.action in ("favorite", "unfavorite"):
            return (
                obj.privacy_level == PrivacyLevel.public.value
                or request.user == obj.author
            )
        return request.user == obj.author


class HasUserListItemPermissions(BasePermission):
    """Permission to view/modify UserListItems"""

    def has_permission(self, request, view):
        user_list = get_object_or_404(
            UserList,
            id=view.kwargs.get(f"{DRF_NESTED_PARENT_LOOKUP_PREFIX}user_list_id", None),
        )
        if request.method in SAFE_METHODS:
            return (
                user_list.privacy_level == PrivacyLevel.public.value
                or request.user == user_list.author
            )
        return request.user == user_list.author

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return (
                obj.user_list.privacy_level == PrivacyLevel.public.value
                or request.user == obj.user_list.author
            )
        return request.user == obj.user_list.author


class HasStaffListPermission(BasePermission):
    """
    Permission to view/create/modify StaffLists
    """

    def has_permission(self, request, view):
        return (
            is_readonly(request)
            or is_admin_user(request)
            or is_staff_list_editor(request)
        )

    def has_object_permission(self, request, view, obj):
        can_edit = is_staff_list_editor(request) or is_admin_user(request)
        if request.method in SAFE_METHODS or view.action in ("favorite", "unfavorite"):
            return obj.privacy_level == PrivacyLevel.public.value or can_edit
        return can_edit


class HasStaffListItemPermissions(BasePermission):
    """Permission to view/create/modify StaffListItems"""

    def has_permission(self, request, view):
        staff_list = get_object_or_404(
            StaffList,
            id=view.kwargs.get(f"{DRF_NESTED_PARENT_LOOKUP_PREFIX}staff_list_id", None),
        )
        can_edit = is_staff_list_editor(request) or is_admin_user(request)
        if request.method in SAFE_METHODS:
            return staff_list.privacy_level == PrivacyLevel.public.value or can_edit
        return can_edit

    def has_object_permission(self, request, view, obj):
        can_edit = is_staff_list_editor(request) or is_admin_user(request)
        if request.method in SAFE_METHODS:
            return obj.staff_list.privacy_level == PrivacyLevel.public.value or can_edit
        return can_edit
