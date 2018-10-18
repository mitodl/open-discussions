"""URL configurations for profiles"""
from django.conf.urls import url, include

from rest_framework.routers import DefaultRouter

from profiles.views import UserViewSet, ProfileViewSet, name_initials_avatar_view

router = DefaultRouter()
router.register(r"users", UserViewSet, base_name="user_api")
router.register(r"profiles", ProfileViewSet, base_name="profile_api")

urlpatterns = [
    url(r"^api/v0/", include(router.urls)),
    # The URL that gravatar will redirect to if no gravatar exists for the user (no query parameters allowed).
    url(
        r"^profile/(?P<username>[A-Za-z0-9_]+)/(?P<size>\d+)/(?P<color>[A-Za-z0-9]+)/(?P<bgcolor>[A-Za-z0-9]+).png",
        name_initials_avatar_view,
        name="name-initials-avatar",
    ),
]
