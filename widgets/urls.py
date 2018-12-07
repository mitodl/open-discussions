"""
WidgetApp urls
"""
from django.conf.urls import url
from django.urls import include
from rest_framework import routers

from widgets.views import WidgetListViewSet

router = routers.DefaultRouter()
router.register(r"widget_lists", WidgetListViewSet, basename="widget_list")

urlpatterns = [url(r"^api/v0/", include(router.urls))]
