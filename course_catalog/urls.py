"""project URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.urls import include
from rest_framework_extensions.routers import ExtendedSimpleRouter
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from course_catalog import views
from course_catalog.views import WebhookOCWNextView, WebhookOCWView

router = ExtendedSimpleRouter()

router.register(r"courses", views.CourseViewSet, basename="courses")
router.register(r"programs", views.ProgramViewSet, basename="programs")
router.register(r"userlists", views.UserListViewSet, basename="userlists").register(
    r"items",
    views.UserListItemViewSet,
    basename="userlistitems",
    parents_query_lookups=["user_list_id"],
)
router.register(r"stafflists", views.StaffListViewSet, basename="stafflists").register(
    r"items",
    views.StaffListItemViewSet,
    basename="stafflistitems",
    parents_query_lookups=["staff_list_id"],
)
router.register(r"videos", views.VideoViewSet, basename="videos")
router.register(r"favorites", views.FavoriteItemViewSet, basename="favorites")
router.register(r"topics", views.TopicViewSet, basename="topics")
router.register(r"podcasts", views.PodcastViewSet, basename="podcasts")
router.register(
    r"podcastepisodes", views.PodcastEpisodesViewSet, basename="podcastepisodes"
)


urlpatterns = [
    url(
        r"^api/v0/podcasts/recent/$",
        views.RecentPodcastEpisodesViewSet.as_view({"get": "list"}),
        name="recent-podcast-episodes",
    ),
    url(
        r"^api/v0/podcasts/(?P<pk>[^/.]+)/episodes/$",
        views.EpisodesInPodcast.as_view({"get": "list"}),
        name="episodes-in-podcast",
    ),
    url(r"^api/v0/", include(router.urls)),
    url(r"^api/v0/ocw_webhook/$", WebhookOCWView.as_view(), name="ocw-webhook"),
    url(
        r"^api/v0/ocw_next_webhook/$",
        WebhookOCWNextView.as_view(),
        name="ocw-next-webhook",
    ),
    url(
        r"^api/v0/ocw-course-report", views.ocw_course_report, name="ocw-course-report"
    ),
    url(r"^podcasts/rss_feed", views.podcast_rss_feed, name="podcast-rss-feed"),
    url(r"api/v0/schema/$", SpectacularAPIView.as_view(), name="schema"),
    url(
        "api/v0/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    url(
        "api/v0/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]
