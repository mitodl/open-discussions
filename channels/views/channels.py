"""Views for REST APIs for channels"""
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework import status

from channels.api import Api
from channels.models import Channel
from channels.serializers import ChannelSerializer
from channels.utils import translate_praw_exceptions
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    IsStaffOrReadonlyPermission,
    IsStaffModeratorOrReadonlyPermission,
)


class ChannelListView(ListCreateAPIView):
    """
    View for listing and creating channels
    """

    permission_classes = (
        AnonymousAccessReadonlyPermission,
        IsStaffOrReadonlyPermission,
    )
    serializer_class = ChannelSerializer

    def get_serializer_context(self):
        """Context for the request and view"""
        channels = {channel.name: channel for channel in Channel.objects.all()}

        return {
            "channel_api": self.request.channel_api,
            "channels": channels,
            "view": self,
        }

    def get_queryset(self):
        """Get generator for channels list"""
        api = Api(user=self.request.user)
        return api.list_channels()

    def list(self, request, *args, **kwargs):
        """Return the channels list in alphabetical order"""
        queryset = self.get_queryset()
        serializer = ChannelSerializer(queryset, many=True)
        return Response(
            sorted(serializer.data, key=lambda channel: channel["title"].lower())
        )

    def post(self, request, *args, **kwargs):
        with translate_praw_exceptions(request.user):
            return super().post(request, *args, **kwargs)


class ChannelDetailView(RetrieveUpdateAPIView):
    """
    View for getting information about or updating a specific channel
    """

    permission_classes = (
        AnonymousAccessReadonlyPermission,
        IsStaffModeratorOrReadonlyPermission,
    )
    serializer_class = ChannelSerializer

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            "channel_api": self.request.channel_api,
            "channels": {
                self.kwargs["channel_name"]: get_object_or_404(
                    Channel, name=self.kwargs["channel_name"]
                )
            },
            "view": self,
        }

    def get_object(self):
        """Get channel referenced by API"""
        api = Api(user=self.request.user)
        return api.get_channel(self.kwargs["channel_name"])

    def get(self, request, *args, **kwargs):
        # we don't want to let this through to Reddit, because it blows up :/
        if len(kwargs["channel_name"]) == 1:
            return Response({}, status=status.HTTP_404_NOT_FOUND)

        with translate_praw_exceptions(request.user):
            return super().get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        with translate_praw_exceptions(request.user):
            return super().patch(request, *args, **kwargs)
