"""Embed.ly views"""
from urllib.parse import unquote
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from django.conf import settings

from channels.models import LinkThumbnail
from embedly.api import get_embedly
from open_discussions.permissions import AnonymousAccessReadonlyPermission


@api_view()
@permission_classes([AnonymousAccessReadonlyPermission])
def embedly_view(request, **kwargs):  # pylint: disable=unused-argument
    """get Embedly API, return the JSON"""
    if settings.EMBEDLY_KEY:
        url = unquote(unquote(kwargs["url"]))
        response = get_embedly(url).json()
        if 'thumbnail_url' in response:
            LinkThumbnail.objects.get_or_create(url=url, defaults={
                'thumbnail': response['thumbnail_url']
            })
        return Response(response)
    else:
        return Response({}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
