"""URL configurations for channels"""
from django.conf.urls import url

from channels.views import (
    ChannelDetailView,
    ChannelListView,
)

urlpatterns = [
    url(r'^api/v0/channels/$', ChannelListView.as_view(), name='channel-list'),
    url(r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/$', ChannelDetailView.as_view(), name='channel-detail')
]
