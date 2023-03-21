"""Views for REST APIs for moderators"""
from django.conf import settings
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers.moderators import (
    ModeratorPrivateSerializer,
    ModeratorPublicSerializer,
)
from channels.utils import translate_praw_exceptions
from open_discussions.permissions import (
    AnonymousAccessReadonlyPermission,
    ModeratorPermissions,
    is_moderator,
    is_admin_user,
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
            if (is_admin_user(self.request) or is_moderator(self.request, self))
            else ModeratorPublicSerializer
        )

    def get_serializer_context(self):
        """Context for the request and view"""
        channel_api = self.request.channel_api
        channel_name = self.kwargs["channel_name"]
        mods = list(
            channel_api._list_moderators(  # pylint: disable=protected-access
                channel_name=channel_name, moderator_name=channel_api.user.username
            )
        )
        if mods:
            user_mod_date = mods[0].date
        else:
            user_mod_date = None

        return {"channel_api": channel_api, "view": self, "mod_date": user_mod_date}

    def get_queryset(self):
        """Get a list of moderators for channel"""
        api = self.request.channel_api
        channel_name = self.kwargs["channel_name"]
        return sorted(
            (
                moderator
                for moderator in api.list_moderators(channel_name)
                if moderator.name != settings.INDEXING_API_USERNAME
            ),
            key=lambda moderator: 0 if moderator.name == api.user.username else 1,
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
