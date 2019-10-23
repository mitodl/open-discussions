"""
course_catalog permissions
"""

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
        if request.method in SAFE_METHODS:
            return (
                obj.privacy_level == PrivacyLevel.public.value
                or request.user == obj.author
            )
        return request.user == obj.author


class HasUserListItemPermissions(BasePermission):
    """Permission to modify UserListItems"""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        else:
            # user_list will be in data if creating a new item
            user_list = UserList.objects.filter(
                id=request.data.get("user_list", None)
            ).first()
            if not user_list or user_list.author == request.user:
                return True
        return False

    def has_object_permission(self, request, view, obj):
        return request.user == obj.user_list.author
