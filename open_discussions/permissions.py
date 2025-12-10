"""Custom permissions"""
from rest_framework import permissions

from open_discussions import features


def channel_exists(view):
    """Return True (deprecated - channels removed)

    Args:
        view (rest_framework.views.APIView): django DRF view

    Returns:
        bool: True

    """
    return True


def is_admin_user(request):
    """Args:
        request (HTTPRequest): django request object

    Returns:
        bool: True if user is staff/admin

    """
    return request.user is not None and (
        request.user.is_staff or request.user.is_superuser
    )


def is_moderator(request, view):
    """Helper function to check if a user is a moderator (deprecated - always False)

    Args:
        request (HTTPRequest): django request object
        view (APIView): a DRF view object

    Returns:
        bool: False (channels removed)

    """
    return False


def channel_is_mod_editable(view):
    """Helper function to check that a channel can be edited (deprecated - always False)

    Args:
        view (APIView): a DRF view object

    Returns:
        bool: False (channels removed)

    """
    return False


def is_readonly(request):
    """Returns True if the request uses a readonly verb

    Args:
        request (HTTPRequest): A request

    Returns:
        bool: True if the request method is readonly

    """
    return request.method in permissions.SAFE_METHODS


class IsStaffPermission(permissions.BasePermission):
    """Checks the user for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role"""
        return is_admin_user(request)


class IsStaffOrReadonlyPermission(permissions.BasePermission):
    """Checks the user for the staff permission"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role or if the request is readonly"""
        return is_readonly(request) or is_admin_user(request)


class IsStaffOrModeratorPermission(permissions.BasePermission):
    """Checks that the user is either staff or a moderator"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role or is a moderator"""
        return channel_exists(view) and (
            is_admin_user(request) or is_moderator(request, view)
        )


class IsStaffModeratorOrReadonlyPermission(permissions.BasePermission):
    """Checks that the user is either staff, a moderator, or performing a readonly operation"""

    def has_permission(self, request, view):
        """Returns True if the user has the staff role, is a moderator, or the request is readonly"""
        return channel_exists(view) and (
            is_readonly(request)
            or is_admin_user(request)
            or is_moderator(request, view)
        )


class IsOwnSubscriptionOrAdminPermission(permissions.BasePermission):
    """Checks that the user is (1) staff/moderator, (2) editing their own subscription, or (3) making
    a readonly request
    """

    @staticmethod
    def is_own_resource_request(request, view):
        """Returns True if the request is on the user's own behalf"""
        resource_owner_username = view.kwargs.get(
            "subscriber_name", None
        ) or request.data.get("subscriber_name", None)
        return resource_owner_username == request.user.username

    def has_permission(self, request, view):
        """Returns True if user is (1) staff/moderator, (2) editing their own subscription, or (3) making
        a readonly request
        """
        return (
            is_readonly(request)
            or self.is_own_resource_request(request, view)
            or is_admin_user(request)
            or is_moderator(request, view)
        )


class ContributorPermissions(permissions.BasePermission):
    """Only staff and moderators should be able to see and edit the list of contributors"""

    def has_permission(self, request, view):
        if not channel_exists(view):
            return False
        # Allow self-delete
        if (
            request.method == "DELETE"
            and view.kwargs.get("contributor_name", None) == request.user.username
        ):
            return True
        return is_admin_user(request) or (
            (channel_is_mod_editable(view) or is_readonly(request))
            and is_moderator(request, view)
        )


class ModeratorPermissions(permissions.BasePermission):
    """All users should be able to see a list of moderators. Only staff and moderators should be able to edit it."""

    def has_permission(self, request, view):
        return channel_exists(view) and (
            is_readonly(request)
            or is_admin_user(request)
            or (channel_is_mod_editable(view) and is_moderator(request, view))
        )


class AnonymousAccessReadonlyPermission(permissions.BasePermission):
    """Checks that the user is authenticated or is allowed anonymous access"""

    def has_permission(self, request, view):
        """Is the user authenticated or allowed anonymous access?"""
        if request.user.is_anonymous and not is_readonly(request):
            return False
        return True


class ReadOnly(permissions.BasePermission):
    """Allows read-only requests through for any user"""

    def has_permission(self, request, view):
        """Return true if the request is read-only"""
        return request.method in permissions.SAFE_METHODS


class ObjectOnlyPermissions(permissions.DjangoObjectPermissions):
    """Validates only object-level permissions"""

    # NOTE: this is because DjangoObjectPermissions subclasses DjangoModelPermissions, which also checks permissions on models

    def has_permission(self, request, view):
        """Ignores model-level permissions"""
        return True


class PodcastFeatureFlag(permissions.BasePermission):
    """Forbids access if the podcast feature flag is not enabled"""

    def has_permission(self, request, view):
        """Check that the feature flag is enabled"""
        return features.is_enabled(features.PODCAST_APIS)
