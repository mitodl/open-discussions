"""Discussions permissions"""
from rest_framework import permissions


class ChannelIsReadableByAnyUser(permissions.BasePermission):
    """Allows access if a channel is publicly viewable"""

    def has_object_permission(self, request, view, obj):
        """Returns true if the channel is public"""
        return obj.is_readable_by_any_user
