"""URL configurations for channels"""
from django.conf.urls import url

from channels.views import (
    ChannelDetailView,
    ChannelListView,
    CommentDetailView,
    CommentListView,
    ContributorListView,
    ContributorDetailView,
    FrontPageView,
    PostDetailView,
    PostListView,
)

urlpatterns = [
    url(r'^api/v0/channels/$', ChannelListView.as_view(), name='channel-list'),
    url(r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/$', ChannelDetailView.as_view(), name='channel-detail'),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/posts/$',
        PostListView.as_view(),
        name='post-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/$',
        ContributorListView.as_view(),
        name='contributor-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/(?P<contributor_name>[A-Za-z0-9_]+)/$',
        ContributorDetailView.as_view(),
        name='contributor-detail',
    ),
    url(
        r'api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/$',
        PostDetailView.as_view(),
        name='post-detail',
    ),
    url(
        r'api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/comments/$',
        CommentListView.as_view(),
        name='comment-list',
    ),
    url(
        r'api/v0/comments/(?P<comment_id>[A-Za-z0-9_]+)/$',
        CommentDetailView.as_view(),
        name='comment-detail',
    ),
    url(r'api/v0/frontpage/$', FrontPageView.as_view(), name='frontpage'),
]
