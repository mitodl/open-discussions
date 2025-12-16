"""URL configurations for notifications"""
from django.urls import include, re_path
from rest_framework.routers import DefaultRouter

from notifications.views import NotificationSettingsViewSet

router = DefaultRouter()
router.register(
    r"notification_settings",
    NotificationSettingsViewSet,
    basename="notification_settings",
)

urlpatterns = [re_path(r"^api/v0/", include(router.urls))]
