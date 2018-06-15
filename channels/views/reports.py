"""Views for REST APIs for reporting posts and comments"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from open_discussions.permissions import JwtIsStaffOrModeratorPermission
from channels.api import Api
from channels.serializers import ReportSerializer, ReportedContentSerializer
from channels.utils import translate_praw_exceptions


class ReportContentView(APIView):
    """
    View to report a comment or post
    """
    permission_classes = (IsAuthenticated,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'channel_api': self.request.channel_api,
            'current_user': self.request.user,
            'request': self.request,
            'view': self,
        }

    def post(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Create a report"""
        with translate_praw_exceptions(request.user):
            serializer = ReportSerializer(
                data=request.data,
                context=self.get_serializer_context(),
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
            )


class ChannelReportListView(APIView):
    """
    Moderator view for reported comments and posts in a channels
    """

    permission_classes = (IsAuthenticated, JwtIsStaffOrModeratorPermission)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'channel_api': self.request.channel_api,
            'current_user': self.request.user,
            'request': self.request,
            'view': self,
        }

    def get(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """List of reports"""
        with translate_praw_exceptions(request.user):
            api = Api(user=request.user)
            reports = api.list_reports(self.kwargs['channel_name'])
            serializer = ReportedContentSerializer(
                reports,
                many=True,
                context=self.get_serializer_context(),
            )

            return Response(serializer.data)
