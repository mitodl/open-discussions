"""URL configurations for channels"""
from django.urls import re_path, include
from rest_framework.routers import DefaultRouter

from channels.views import (
    channels,
    comments,
    contributors,
    frontpage,
    invites,
    moderators,
    posts,
    reports,
    subscribers,
)

router = DefaultRouter()
router.register(
    r"invites", invites.ChannelInvitationViewSet, basename="channel_invitation_api"
)

urlpatterns = [
    re_path(r"^api/v0/channels/$", channels.ChannelListView.as_view(), name="channel-list"),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/$",
        channels.ChannelDetailView.as_view(),
        name="channel-detail",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/posts/$",
        posts.PostListView.as_view(),
        name="post-list",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/$",
        contributors.ContributorListView.as_view(),
        name="contributor-list",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/(?P<contributor_name>[A-Za-z0-9_]+)/$",
        contributors.ContributorDetailView.as_view(),
        name="contributor-detail",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/moderators/$",
        moderators.ModeratorListView.as_view(),
        name="moderator-list",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/moderators/(?P<moderator_name>[A-Za-z0-9_]+)/$",
        moderators.ModeratorDetailView.as_view(),
        name="moderator-detail",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/subscribers/$",
        subscribers.SubscriberListView.as_view(),
        name="subscriber-list",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/subscribers/(?P<subscriber_name>[A-Za-z0-9_]+)/$",
        subscribers.SubscriberDetailView.as_view(),
        name="subscriber-detail",
    ),
    re_path(
        r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/reports/$",
        reports.ChannelReportListView.as_view(),
        name="channel-reports",
    ),
    re_path(r"^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/", include(router.urls)),
    re_path(
        r"api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/$",
        posts.PostDetailView.as_view(),
        name="post-detail",
    ),
    re_path(
        r"api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/comments/$",
        comments.CommentListView.as_view(),
        name="comment-list",
    ),
    re_path(
        r"api/v0/comments/(?P<comment_id>[A-Za-z0-9_]+)/$",
        comments.CommentDetailView.as_view(),
        name="comment-detail",
    ),
    re_path(
        r"api/v0/morecomments/$",
        comments.MoreCommentsView.as_view(),
        name="morecomments-detail",
    ),
    re_path(r"api/v0/frontpage/$", frontpage.FrontPageView.as_view(), name="frontpage"),
    re_path(
        r"api/v0/reports/$", reports.ReportContentView.as_view(), name="report-content"
    ),
]
