"""URL configurations for channels"""
from django.conf.urls import url

from embedly.views import embedly_view

urlpatterns = [
    url(r"^api/v0/embedly/(?P<url>.+)/$", embedly_view, name="embedly-detail")
]
