"""URLs for search"""
from django.urls import re_path

from search.views import RelatedPostsView, SearchView, SimilarResourcesView

urlpatterns = [
    re_path(r"api/v0/search/", SearchView.as_view(), name="search"),
    re_path(
        r"api/v0/related/(?P<post_id>[A-Za-z0-9_]+)/$",
        RelatedPostsView.as_view(),
        name="related-posts",
    ),
    re_path(
        r"api/v0/similar/$", SimilarResourcesView.as_view(), name="similar-resources"
    ),
]
