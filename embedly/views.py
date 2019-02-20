"""Embed.ly views"""
from urllib.parse import unquote
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from django.conf import settings

from channels.models import LinkMeta
from embedly.api import get_embedly_summary, THUMBNAIL_URL
from open_discussions.permissions import AnonymousAccessReadonlyPermission


@api_view()
@permission_classes([AnonymousAccessReadonlyPermission])
def embedly_view(request, **kwargs):  # pylint: disable=unused-argument
    """get Embedly API, return the JSON"""
    if settings.EMBEDLY_KEY:
        url = unquote(unquote(kwargs["url"]))
        response = get_embedly_summary(url).json()
        if THUMBNAIL_URL in response:
            LinkMeta.objects.update_or_create(
                url=url, defaults={"thumbnail": response[THUMBNAIL_URL]}
            )
        return Response(response)
    else:
        return Response({}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
