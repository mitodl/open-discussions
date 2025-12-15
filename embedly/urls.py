"""URL configurations for embedly"""
from django.urls import re_path

from embedly.views import embedly_view

urlpatterns = [
    re_path(r"^api/v0/embedly/(?P<url>.+)/$", embedly_view, name="embedly-detail")
]
