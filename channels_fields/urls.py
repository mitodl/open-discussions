"""Urls for channels_fields"""
from django.urls import include, re_path
from rest_framework.routers import DefaultRouter

from channels_fields.views import (
    FieldChannelViewSet,
    FieldModeratorDetailView,
    FieldModeratorListView,
)

router = DefaultRouter()
router.register(r"fields", FieldChannelViewSet, basename="field_channels_api")

urlpatterns = [
    re_path(
        r"^api/v0/fields/(?P<field_name>[A-Za-z0-9_]+)/moderators/$",
        FieldModeratorListView.as_view(),
        name="field_moderators_api-list",
    ),
    re_path(
        r"^api/v0/fields/(?P<field_name>[A-Za-z0-9_]+)/moderators/(?P<moderator_name>[A-Za-z0-9_]+)/$",
        FieldModeratorDetailView.as_view(),
        name="field_moderators_api-detail",
    ),
    re_path(r"^api/v0/", include(router.urls)),
]
