"""CKEditor views"""
import math
from time import time

import jwt
from django.conf import settings
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes

from open_discussions.features import ARTICLE_UI, is_enabled
from open_discussions.permissions import AnonymousAccessReadonlyPermission


@api_view()
@permission_classes([AnonymousAccessReadonlyPermission])
def ckeditor_view(request, **kwargs):
    """Get the JWT to authenticate for CKEditor"""
    if (
        settings.CKEDITOR_SECRET_KEY
        and settings.CKEDITOR_ENVIRONMENT_ID
        and is_enabled(ARTICLE_UI)
    ):
        payload = {"iss": settings.CKEDITOR_ENVIRONMENT_ID, "iat": math.floor(time())}
        token = jwt.encode(payload, settings.CKEDITOR_SECRET_KEY, algorithm="HS256")

        return HttpResponse(token)
    return HttpResponse(status=status.HTTP_503_SERVICE_UNAVAILABLE)
