"""URL configurations for profiles"""
from django.urls import re_path, include

from rest_framework.routers import DefaultRouter

from profiles.views import (
    UserViewSet,
    ProfileViewSet,
    UserWebsiteViewSet,
    name_initials_avatar_view,
    UserContributionListView,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user_api")
router.register(r"profiles", ProfileViewSet, basename="profile_api")
router.register(r"websites", UserWebsiteViewSet, basename="user_websites_api")

urlpatterns = [
    re_path(
        r"^api/v0/profiles/(?P<username>[A-Za-z0-9_]+)/(?P<object_type>posts|comments)/$",
        UserContributionListView.as_view(),
        name="user-contribution-list",
    ),
    re_path(r"^api/v0/", include(router.urls)),
    # The URL that gravatar will redirect to if no gravatar exists for the user (no query parameters allowed).
    re_path(
        r"^profile/(?P<username>[A-Za-z0-9_]+)/(?P<size>\d+)/(?P<color>[A-Za-z0-9]+)/(?P<bgcolor>[A-Za-z0-9]+).png",
        name_initials_avatar_view,
        name="name-initials-avatar",
    ),
]
