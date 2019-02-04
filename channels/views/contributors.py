"""Views for REST APIs for contributors"""

from django.conf import settings
from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import get_admin_api
from channels.serializers.contributors import ContributorSerializer
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
            for contributor in self.request.channel_api.list_contributors(
                self.kwargs["channel_name"]
            )
            if contributor.name != settings.INDEXING_API_USERNAME
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
        # Using the admin API since reddit doesn't let non-mod users remove themselves as contributors
        admin_api = get_admin_api()
        channel_name = self.kwargs["channel_name"]
        contributor_name = self.kwargs["contributor_name"]

        admin_api.remove_contributor(contributor_name, channel_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
