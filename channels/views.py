"""Views for REST APIs for channels"""

from praw.models.reddit.redditor import Redditor
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveDestroyAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from channels.api import Api
from channels.exceptions import RemoveUserException
from channels.serializers import (
    ChannelSerializer,
    CommentSerializer,
    ContributorSerializer,
    PostSerializer,
    ModeratorSerializer,
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


class ModeratorListView(ListCreateAPIView):
    """
    View for listing and adding moderators
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)
    serializer_class = ModeratorSerializer

    def get_queryset(self):
        """Get a list of moderators for channel"""
        api = Api(user=self.request.user)
        channel_name = self.kwargs['channel_name']
        return api.list_moderators(channel_name)


class ModeratorDetailView(RetrieveDestroyAPIView):
    """
    View to retrieve and remove moderators
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)
    serializer_class = ModeratorSerializer

    def get_object(self):
        """Get moderator for the channel"""
        api = Api(user=self.request.user)
        moderator_name = self.kwargs['moderator_name']

        return Redditor(api.reddit, name=moderator_name)

    def perform_destroy(self, moderator):
        """Remove moderator in a channel"""
        api = Api(user=self.request.user)
        channel_name = self.kwargs['channel_name']
        api.remove_moderator(moderator.name, channel_name)


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


class ContributorListView(ListCreateAPIView):
    """
    View to list and add contributors in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = ContributorSerializer

    def get_queryset(self):
        """Get generator for contributors in channel"""
        api = Api(user=self.request.user)
        return api.list_contributors(self.kwargs['channel_name'])


class ContributorDetailView(RetrieveDestroyAPIView):
    """
    View to retrieve and remove contributors in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = ContributorSerializer

    def get_object(self):
        """Get contributor in channel"""
        api = Api(user=self.request.user)
        contributor_name = self.kwargs['contributor_name']
        channel_name = self.kwargs['channel_name']
        if contributor_name not in api.list_contributors(channel_name):
            raise NotFound('User {} is not a contributor of {}'.format(contributor_name, channel_name))
        return Redditor(api.reddit, name=contributor_name)

    def perform_destroy(self, contributor):
        """
        Removes a contributor from a channel
        """
        api = Api(user=self.request.user)
        channel_name = self.kwargs['channel_name']
        api.remove_contributor(contributor.name, channel_name)

    def delete(self, request, *args, **kwargs):
        try:
            return super().delete(self, request, *args, **kwargs)
        except RemoveUserException as exc:
            return Response(
                data={'error': str(exc)},
                status=status.HTTP_409_CONFLICT
            )
