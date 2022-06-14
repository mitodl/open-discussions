"""Urls for field_channels"""
from django.conf.urls import url, include
from rest_framework.routers import DefaultRouter

from field_channels.views import FieldChannelViewSet, FieldModeratorListView, FieldModeratorDetailView

router = DefaultRouter()
router.register(
    r"fields", FieldChannelViewSet, basename="fields_api"
)

urlpatterns = [
    url(
        r"^api/v0/fields/(?P<field_name>[A-Za-z0-9_]+)/moderators/$",
       FieldModeratorListView.as_view(),
        name="field-moderator-list",
    ),
    url(
        r"^api/v0/fields/(?P<field_name>[A-Za-z0-9_]+)/moderators/(?P<moderator_name>[A-Za-z0-9_]+)/$",
        FieldModeratorDetailView.as_view(),
        name="field-moderator-detail",
    ),
    url(r"^api/v0/", include(router.urls)),
]
