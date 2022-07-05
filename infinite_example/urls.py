"""URL configuration for infinite_example"""
from django.conf import settings
from django.conf.urls import url

from infinite_example.views import index

urlpatterns = [url(r"^infinite", index)] if settings.ENABLE_INFINITE_CORRIDOR else []
