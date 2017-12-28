"""Views for REST APIs for channels"""

from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.permissions import IsAuthenticated

from channels.api import Api
from channels.serializers import ChannelSerializer
from channels.utils import translate_praw_exceptions
from open_discussions.permissions import (
    JwtIsStaffOrReadonlyPermission,
    JwtIsStaffModeratorOrReadonlyPermission,
)


class ChannelListView(ListCreateAPIView):
    """
    View for listing and creating channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)
    serializer_class = ChannelSerializer

    def get_queryset(self):
        """Get generator for channels list"""
        api = Api(user=self.request.user)
        return api.list_channels()

    def post(self, request, *args, **kwargs):
        with translate_praw_exceptions():
            return super().post(request, *args, **kwargs)


class ChannelDetailView(RetrieveUpdateAPIView):
    """
    View for getting information about or updating a specific channel
    """
    permission_classes = (IsAuthenticated, JwtIsStaffModeratorOrReadonlyPermission,)
    serializer_class = ChannelSerializer

    def get_object(self):
        """Get channel referenced by API"""
        api = Api(user=self.request.user)
        return api.get_channel(self.kwargs['channel_name'])

    def get(self, request, *args, **kwargs):
        with translate_praw_exceptions():
            return super().get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        with translate_praw_exceptions():
            return super().patch(request, *args, **kwargs)
