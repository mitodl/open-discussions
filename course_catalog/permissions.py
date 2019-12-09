"""
course_catalog permissions
"""
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import SAFE_METHODS, BasePermission

from course_catalog.constants import PrivacyLevel
from course_catalog.models import UserList


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
            UserList, id=view.kwargs.get("parent_lookup_user_list_id", None)
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
