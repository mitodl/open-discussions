"""livestream URL"""
from django.conf.urls import url

from livestream.views import livestream_view

urlpatterns = [url(r"^api/v0/livestream/$", livestream_view, name="livestream")]
