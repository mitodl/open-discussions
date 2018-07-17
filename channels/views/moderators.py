"""Views for REST APIs for moderators"""

from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers import (
    ModeratorPrivateSerializer,
    ModeratorPublicSerializer,
)
from channels.utils import translate_praw_exceptions
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    is_moderator,
    is_staff_jwt,
    JwtIsStaffModeratorOrReadonlyPermission,
)


class ModeratorListView(ListCreateAPIView):
    """
    View for listing and adding moderators
    """
    permission_classes = (AnonymousAccessReadonlyPermission, JwtIsStaffModeratorOrReadonlyPermission,)

    def get_serializer_class(self):
        """
        Pick private serializer if user is moderator of this channel, else use public one
        """
        return ModeratorPrivateSerializer if (
            is_staff_jwt(self.request) or is_moderator(self.request, self)
        ) else ModeratorPublicSerializer

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'channel_api': self.request.channel_api,
            'view': self,
        }

    def get_queryset(self):
        """Get a list of moderators for channel"""
        api = Api(user=self.request.user)
        channel_name = self.kwargs['channel_name']
        return api.list_moderators(channel_name)


class ModeratorDetailView(APIView):
    """
    View to retrieve and remove moderators
    """
    permission_classes = (AnonymousAccessReadonlyPermission, JwtIsStaffModeratorOrReadonlyPermission,)

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a moderator from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs['channel_name']
        moderator_name = self.kwargs['moderator_name']

        with translate_praw_exceptions(request.user):
            api.remove_moderator(moderator_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
