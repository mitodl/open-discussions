"""Views for REST APIs for contributors"""

from praw.models import Redditor
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.api import Api
from channels.serializers import ContributorSerializer
from open_discussions.permissions import JwtIsStaffOrReadonlyPermission


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
