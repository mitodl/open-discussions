"""URL configurations for channels"""
from django.conf import settings
from django.conf.urls import include, url
from django.contrib import admin
from rest_framework import routers

from channels.views import (
    ChannelDetailView,
    ChannelListView,
)

urlpatterns = [
    url(r'^api/v0/channels/$', ChannelListView.as_view()),
    url(r'^api/v0/channels/(?P<channel_name>[A-Za-z0-9_]+)/$', ChannelDetailView.as_view())
]
