"""Livestream Views"""
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from livestream.api import get_upcoming_events


@api_view(["GET"])
@permission_classes([])
def livestream_view(request, **kwargs):  # pylint: disable=unused-argument
    """Get the upcoming events, return the JSON"""
    if settings.LIVESTREAM_ACCOUNT_ID and settings.LIVESTREAM_SECRET_KEY:
        response = get_upcoming_events().json()
        return Response(response)
    return Response({}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
