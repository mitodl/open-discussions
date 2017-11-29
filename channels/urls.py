"""URL configurations for channels"""
from django.conf.urls import url

from channels import views

urlpatterns = [
    url(r'^api/v0/channels/$', views.ChannelListView.as_view(), name='channel-list'),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/$',
        views.ChannelDetailView.as_view(), name='channel-detail'
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/posts/$',
        views.PostListView.as_view(),
        name='post-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/$',
        views.ContributorListView.as_view(),
        name='contributor-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/contributors/(?P<contributor_name>[A-Za-z0-9_]+)/$',
        views.ContributorDetailView.as_view(),
        name='contributor-detail',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/moderators/$',
        views.ModeratorListView.as_view(),
        name='moderator-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/moderators/(?P<moderator_name>[A-Za-z0-9_]+)/$',
        views.ModeratorDetailView.as_view(),
        name='moderator-detail',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/subscribers/$',
        views.SubscriberListView.as_view(),
        name='subscriber-list',
    ),
    url(
        r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/subscribers/(?P<subscriber_name>[A-Za-z0-9_]+)/$',
        views.SubscriberDetailView.as_view(),
        name='subscriber-detail',
    ),
    url(
        r'api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/$',
        views.PostDetailView.as_view(),
        name='post-detail',
    ),
    url(
        r'api/v0/posts/(?P<post_id>[A-Za-z0-9_]+)/comments/$',
        views.CommentListView.as_view(),
        name='comment-list',
    ),
    url(
        r'api/v0/comments/(?P<comment_id>[A-Za-z0-9_]+)/$',
        views.CommentDetailView.as_view(),
        name='comment-detail',
    ),
    url(
        r'api/v0/morecomments/$',
        views.MoreCommentsView.as_view(),
        name='morecomments-detail',
    ),
    url(r'api/v0/frontpage/$', views.FrontPageView.as_view(), name='frontpage'),
]
