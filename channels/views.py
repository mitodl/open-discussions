"""Views for REST APIs for channels"""

from functools import lru_cache
from django.contrib.auth import get_user_model
from praw.models.reddit.redditor import Redditor
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from channels.api import Api
from channels.serializers import (
    ChannelSerializer,
    CommentSerializer,
    ContributorSerializer,
    SubscriberSerializer,
    PostSerializer,
    ModeratorSerializer,
)
from open_discussions.permissions import JwtIsStaffOrReadonlyPermission

User = get_user_model()


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


class ModeratorDetailView(APIView):
    """
    View to retrieve and remove moderators
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission,)

    def get(self, request, *args, **kwargs):
        """Get moderator for the channel"""
        api = Api(user=request.user)
        moderator_name = self.kwargs['moderator_name']
        channel_name = self.kwargs['channel_name']
        if moderator_name not in api.list_moderators(channel_name):
            raise NotFound('User {} is not a moderator of {}'.format(moderator_name, channel_name))
        return Response(
            ModeratorSerializer(
                Redditor(api.reddit, name=moderator_name)
            ).data
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a contributor from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        moderator_name = self.kwargs['moderator_name']

        api.remove_moderator(moderator_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)


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

    def get_serializer_context(self):
        context = super().get_serializer_context()

        if self.request.method == 'GET':
            comments = self.get_queryset()
            comment_users = User.objects.filter(
                username__in=[comment.author.name for comment in comments]
            ).select_related('profile')

            context["profile_images"] = {
                user.username: user.profile.image_small for user in comment_users
            }
        return context

    @lru_cache(maxsize=1)
    def get_queryset(self):
        """Get generator for comments"""
        api = Api(user=self.request.user)
        return list(api.list_comments(self.kwargs['post_id']))


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


class ContributorDetailView(APIView):
    """
    View to retrieve and remove contributors in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )

    def get(self, request, *args, **kwargs):
        """Get contributor in channel"""
        api = Api(user=request.user)
        contributor_name = self.kwargs['contributor_name']
        channel_name = self.kwargs['channel_name']
        if contributor_name not in api.list_contributors(channel_name):
            raise NotFound('User {} is not a contributor of {}'.format(contributor_name, channel_name))
        return Response(
            ContributorSerializer(
                Redditor(api.reddit, name=contributor_name)
            ).data
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a contributor from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        contributor_name = self.kwargs['contributor_name']

        api.remove_contributor(contributor_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubscriberListView(CreateAPIView):
    """
    View to add subscribers in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )
    serializer_class = SubscriberSerializer


class SubscriberDetailView(APIView):
    """
    View to retrieve and remove subscribers in channels
    """
    permission_classes = (IsAuthenticated, JwtIsStaffOrReadonlyPermission, )

    def get(self, request, *args, **kwargs):
        """Get moderator for the channel"""
        api = Api(user=request.user)
        subscriber_name = self.kwargs['subscriber_name']
        channel_name = self.kwargs['channel_name']
        if not api.is_subscriber(subscriber_name, channel_name):
            raise NotFound('User {} is not a subscriber of {}'.format(subscriber_name, channel_name))
        return Response(
            SubscriberSerializer(
                Redditor(api.reddit, name=subscriber_name)
            ).data
        )

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a contributor from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        subscriber_name = self.kwargs['subscriber_name']

        api.remove_subscriber(subscriber_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
