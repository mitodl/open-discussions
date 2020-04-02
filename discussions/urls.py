"""URL configurations for channels"""
from django.conf.urls import include, url
from rest_framework.routers import DefaultRouter

from discussions.views import ChannelViewSet

urlpatterns = []

router = DefaultRouter()
router.register(r"channels", ChannelViewSet, basename="channel_api_v1")

urlpatterns += [url(r"^api/v1/", include(router.urls))]
