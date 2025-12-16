"""WidgetApp urls
"""
from django.urls import include, re_path
from rest_framework import routers

from widgets.views import WidgetListViewSet

router = routers.DefaultRouter()
router.register(r"widget_lists", WidgetListViewSet, basename="widget_list")

urlpatterns = [re_path(r"^api/v0/", include(router.urls))]
