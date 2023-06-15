"""livestream URL"""
from django.urls import re_path

from livestream.views import livestream_view

urlpatterns = [re_path(r"^api/v0/livestream/$", livestream_view, name="livestream")]
