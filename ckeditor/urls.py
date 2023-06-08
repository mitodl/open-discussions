"""URL configuration for ckeditor"""
from django.urls import re_path

from ckeditor.views import ckeditor_view

urlpatterns = [re_path(r"api/v0/ckeditor/", ckeditor_view, name="ckeditor-token")]
