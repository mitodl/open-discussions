"""
open_discussions views
"""
import json
from datetime import timedelta

import jwt
from django.conf import settings
from django.shortcuts import render
from rest_framework_jwt.settings import api_settings

from open_discussions.templatetags.render_bundle import public_path


def index(request):
    """
    The index view.
    """
    auth = request.COOKIES.get(api_settings.JWT_AUTH_COOKIE)

    try:
        # verify with JWT instead of JWT_DECODE_HANDLER because we want to decode expired tokens
        payload = jwt.decode(
            auth,
            api_settings.JWT_SECRET_KEY,
            # use a high leeway because we're interested in whether this token was ever valid
            leeway=timedelta(days=365),
            algorithms=[api_settings.JWT_ALGORITHM]
        )
        auth_url = payload.get("auth_url", None)
        session_url = payload.get("session_url", None)
    except jwt.InvalidTokenError:
        auth_url = None
        session_url = None

    js_settings = {
        "gaTrackingID": settings.GA_TRACKING_ID,
        "public_path": public_path(request),
        "auth_url": auth_url,
        "session_url": session_url,
        "micromasters_external_login_url": settings.MICROMASTERS_EXTERNAL_LOGIN_URL,
    }

    return render(request, "index.html", context={
        "js_settings_json": json.dumps(js_settings),
    })
