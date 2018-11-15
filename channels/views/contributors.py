"""Views for REST APIs for contributors"""

from django.conf import settings
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.models import Channel
from channels.serializers import ContributorSerializer
from open_discussions.permissions import ContributorPermissions


class ContributorListView(ListCreateAPIView):
    """
    View to list and add contributors in channels
    """

    permission_classes = (IsAuthenticated, ContributorPermissions)
    serializer_class = ContributorSerializer

    def get_serializer_context(self):
        """Context for the request and view"""
        return {"channel_api": self.request.channel_api, "view": self}

    def get_queryset(self):
        """Get generator for contributors in channel"""
        return (
            contributor
            for contributor in list(
                Channel.objects.get(name=self.kwargs["channel_name"]).contributors
            )
            if contributor.username != settings.INDEXING_API_USERNAME
        )


class ContributorDetailView(APIView):
    """
    View to retrieve and remove contributors in channels
    """

    permission_classes = (IsAuthenticated, ContributorPermissions)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {"channel_api": self.request.channel_api, "view": self}

    def delete(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """
        Removes a contributor from a channel
        """
        api = Api(user=request.user)
        channel_name = self.kwargs["channel_name"]
        contributor_name = self.kwargs["contributor_name"]

        api.remove_contributor(contributor_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
