"""Views for REST APIs for reporting posts and comments"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from channels.serializers import ReportSerializer
from channels.utils import translate_praw_exceptions


class ReportContentView(APIView):
    """
    View to report a comment or post
    """
    permission_classes = (IsAuthenticated,)

    def get_serializer_context(self):
        """Context for the request and view"""
        return {
            'request': self.request,
        }

    def post(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Create a report"""
        with translate_praw_exceptions():
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
