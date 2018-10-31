"""URL configuration for ckeditor"""
from django.conf.urls import url

from ckeditor.views import ckeditor_view

urlpatterns = [url(r"api/v0/ckeditor/", ckeditor_view, name="ckeditor-token")]
