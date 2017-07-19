"""Views for REST APIs for channels"""

from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)

from channels.api import Api
from channels.serializers import (
    ChannelSerializer,
    PostSerializer,
)


class ChannelListView(ListCreateAPIView):
    """
    View for listing and creating channels
    """
    serializer_class = ChannelSerializer

    def get_queryset(self):
        """Get generator for channels list"""
        api = Api(user=self.request.user)
        return api.list_channels()


class ChannelDetailView(RetrieveUpdateAPIView):
    """
    View for getting information about or updating a specific channel
    """
    serializer_class = ChannelSerializer

    def get_object(self):
        """Get channel referenced by API"""
        api = Api(user=self.request.user)
        return api.get_channel(self.kwargs['channel_name'])


class PostListView(ListCreateAPIView):
    """
    View for listing and creating posts
    """
    serializer_class = PostSerializer

    def get_queryset(self):
        """Get generator for posts list"""
        api = Api(user=self.request.user)
        return api.list_posts(self.kwargs['channel_name'])


class PostDetailView(RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating or destroying posts
    """
    serializer_class = PostSerializer

    def get_object(self):
        """Get post"""
        api = Api(user=self.request.user)
        return api.get_post(self.kwargs['post_id'])
