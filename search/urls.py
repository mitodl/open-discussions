"""URLs for search"""
from django.conf.urls import url

from search.views import SearchView

urlpatterns = [url(r"api/v0/search/", SearchView.as_view(), name="search")]
