"""Views for REST APIs for moderators"""
from django.conf import settings
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.constants import ROLE_SEQ
from channels.models import Channel
from channels.serializers import ModeratorPrivateSerializer, ModeratorPublicSerializer
from channels.utils import translate_praw_exceptions
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    ModeratorPermissions,
    is_moderator,
    is_staff_user,
)


class ModeratorListView(ListCreateAPIView):
    """
    View for listing and adding moderators
    """

    permission_classes = (AnonymousAccessReadonlyPermission, ModeratorPermissions)

    def get_serializer_class(self):
        """
        Pick private serializer if user is moderator of this channel, else use public one
        """
        return (
            ModeratorPrivateSerializer
            if (is_staff_user(self.request) or is_moderator(self.request, self))
            else ModeratorPublicSerializer
        )

    def get_serializer_context(self):
        """Context for the request and view"""
        channel_api = self.request.channel_api
        channel_name = self.kwargs["channel_name"]
        mods = list(Channel.objects.get(name=channel_name).moderators)
        if mods and self.request.user in mods:
            user_mod_seq = getattr(mods[mods.index(self.request.user)], ROLE_SEQ)
        else:
            user_mod_seq = None

        return {"channel_api": channel_api, "view": self, "mod_seq": user_mod_seq}

    def get_queryset(self):
        """Get a list of moderators for channel"""
        channel_name = self.kwargs["channel_name"]
        return sorted(
            (
                moderator
                for moderator in Channel.objects.get(name=channel_name).moderators
                if moderator.username != settings.INDEXING_API_USERNAME
            ),
            key=lambda moderator: 0 if moderator.username == self.request.user.username else 1
        )


class ModeratorDetailView(APIView):
    """
    View to retrieve and remove moderators
    """

    permission_classes = (AnonymousAccessReadonlyPermission, ModeratorPermissions)

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a moderator from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs["channel_name"]
        moderator_name = self.kwargs["moderator_name"]

        with translate_praw_exceptions(request.user):
            api.remove_moderator(moderator_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
