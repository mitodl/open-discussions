"""Views for REST APIs for channels"""

from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.response import Response
from rest_framework import status

from channels.api import Api
from channels.serializers import ChannelSerializer
from channels.utils import translate_praw_exceptions
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    JwtIsStaffOrReadonlyPermission,
    JwtIsStaffModeratorOrReadonlyPermission,
)


class ChannelListView(ListCreateAPIView):
    """
    View for listing and creating channels
    """
    permission_classes = (AnonymousAccessReadonlyPermission, JwtIsStaffOrReadonlyPermission,)
    serializer_class = ChannelSerializer

    def get_queryset(self):
        """Get generator for channels list"""
        api = Api(user=self.request.user)
        return api.list_channels()

    def post(self, request, *args, **kwargs):
        with translate_praw_exceptions(request.user):
            return super().post(request, *args, **kwargs)


class ChannelDetailView(RetrieveUpdateAPIView):
    """
    View for getting information about or updating a specific channel
    """
    permission_classes = (AnonymousAccessReadonlyPermission, JwtIsStaffModeratorOrReadonlyPermission,)
    serializer_class = ChannelSerializer

    def get_object(self):
        """Get channel referenced by API"""
        api = Api(user=self.request.user)
        return api.get_channel(self.kwargs['channel_name'])

    def get(self, request, *args, **kwargs):
        # we don't want to let this through to Reddit, because it blows up :/
        if len(kwargs['channel_name']) == 1:
            return Response({}, status=status.HTTP_404_NOT_FOUND)

        with translate_praw_exceptions(request.user):
            return super().get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        with translate_praw_exceptions(request.user):
            return super().patch(request, *args, **kwargs)
