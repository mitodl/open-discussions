"""URL configurations for notifications"""
from django.conf.urls import url, include

from rest_framework.routers import DefaultRouter

from notifications.views import NotificationSettingsViewSet

router = DefaultRouter()
router.register(
    r"notification_settings",
    NotificationSettingsViewSet,
    base_name="notification_settings",
)

urlpatterns = [url(r"^api/v0/", include(router.urls))]
