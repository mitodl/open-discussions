"""Views for REST APIs for moderators"""

from praw.models import Redditor
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers import ModeratorSerializer
from open_discussions.permissions import JwtIsStaffOrReadonlyPermission


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
        Removes a moderator from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        moderator_name = self.kwargs['moderator_name']

        api.remove_moderator(moderator_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
