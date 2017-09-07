"""Views for REST APIs for channels"""

from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveDestroyAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import IsAuthenticated

from channels.api import Api
from channels.serializers import (
    ChannelSerializer,
    CommentSerializer,
    PostSerializer,
    SubscriberSerializer,
)
from open_discussions.permissions import JwtIsStaffOrReadonlyPermission


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


class ChannelDetailView(RetrieveUpdateAPIView):
    """
    View for getting information about or updating a specific channel
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)
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


class CommentListView(ListCreateAPIView):
    """
    View for listing and creating comments
    """
    serializer_class = CommentSerializer

    def get_queryset(self):
        """Get generator for comments"""
        api = Api(user=self.request.user)
        return api.list_comments(self.kwargs['post_id'])


class CommentDetailView(RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating or destroying comments
    """
    serializer_class = CommentSerializer

    def get_object(self):
        """Get comment"""
        api = Api(user=self.request.user)
        return api.get_comment(self.kwargs['comment_id'])

    def perform_destroy(self, instance):
        """Delete a comment"""
        instance.delete()


class FrontPageView(ListAPIView):
    """
    View for listing posts
    """
    serializer_class = PostSerializer

    def get_queryset(self):
        """Get generator for front page posts"""
        api = Api(user=self.request.user)
        return api.front_page()


class SubscribeView(RetrieveUpdateAPIView):
    """
    View to retrieve and remove subscriber in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = SubscriberSerializer

    def get_object(self):
        """subscribe user"""
        api = Api(user=self.request.user)
        return api.subscribe(self.kwargs['channel_name'])


class UnSubscribView(RetrieveUpdateAPIView):
    """
    View to retrieve and remove subscriber in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = SubscriberSerializer

    def get_object(self):
        """unsub user"""
        api = Api(user=self.request.user)
        return api.unsubscribe(self.kwargs['channel_name'])
