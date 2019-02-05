"""URLs for search"""
from django.conf.urls import url

from search.views import SearchView, RelatedPostsView

urlpatterns = [
    url(r"api/v0/search/", SearchView.as_view(), name="search"),
    url(
        r"api/v0/related/(?P<post_id>[A-Za-z0-9_]+)/$",
        RelatedPostsView.as_view(),
        name="related-posts",
    ),
]
