"""
course_catalog permissions
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from course_catalog.constants import PrivacyLevel
from course_catalog.models import UserListItem


class HasUserListPermissions(BasePermission):
    """Permission to view/modify UserLists"""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return not request.user.is_anonymous

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, UserListItem):
            obj = obj.user_list
        if request.method in SAFE_METHODS:
            return (
                obj.privacy_level == PrivacyLevel.public.value
                or request.user == obj.author
            )
        return request.user == obj.author
