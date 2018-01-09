"""URL configurations for channels"""
from django.conf.urls import url

from channels.views import (
    channels,
    comments,
    contributors,
    frontpage,
    moderators,
    posts,
    reports,
    subscribers,
)

urlpatterns = [
    url(r'^api/v0/channels/$', channels.ChannelListView.as_view(), name='channel-list'),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/$',
        channels.ChannelDetailView.as_view(), name='channel-detail'
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/posts/$',
        posts.PostListView.as_view(),
        name='post-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/$',
        contributors.ContributorListView.as_view(),
        name='contributor-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/(?P<contributor_name>[A-Za-z0-9_]+)/$',
        contributors.ContributorDetailView.as_view(),
        name='contributor-detail',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/moderators/$',
        moderators.ModeratorListView.as_view(),
        name='moderator-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/moderators/(?P<moderator_name>[A-Za-z0-9_]+)/$',
        moderators.ModeratorDetailView.as_view(),
        name='moderator-detail',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/subscribers/$',
        subscribers.SubscriberListView.as_view(),
        name='subscriber-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/subscribers/(?P<subscriber_name>[A-Za-z0-9_]+)/$',
        subscribers.SubscriberDetailView.as_view(),
        name='subscriber-detail',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/reports/$',
        reports.ChannelReportListView.as_view(),
        name='channel-reports',
    ),
    url(
        r'api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/$',
        posts.PostDetailView.as_view(),
        name='post-detail',
    ),
    url(
        r'api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/comments/$',
        comments.CommentListView.as_view(),
        name='comment-list',
    ),
    url(
        r'api/v0/comments/(?P<comment_id>[A-Za-z0-9_]+)/$',
        comments.CommentDetailView.as_view(),
        name='comment-detail',
    ),
    url(
        r'api/v0/morecomments/$',
        comments.MoreCommentsView.as_view(),
        name='morecomments-detail',
    ),
    url(r'api/v0/frontpage/$', frontpage.FrontPageView.as_view(), name='frontpage'),
    url(
        r'api/v0/reports/$',
        reports.ReportContentView.as_view(),
        name='report-content',
    ),
]
