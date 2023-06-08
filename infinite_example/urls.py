"""URL configuration for infinite_example"""
from django.conf import settings
from django.urls import re_path

from infinite_example.views import index

urlpatterns = (
    [re_path(r"^infinite", index)]
    if settings.ENABLE_INFINITE_CORRIDOR
    else [re_path(r"^infinite/demo", index)]
)
