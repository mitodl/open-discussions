"""
open_discussions views
"""
import json
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.shortcuts import render
from rest_framework_jwt.settings import api_settings

from open_discussions.templatetags.render_bundle import public_path
from sites.models import AuthenticatedSite


User = get_user_model()


def index(request, **kwargs):  # pylint: disable=unused-argument
    """
    The index view.
    """
    auth = request.COOKIES.get(api_settings.JWT_AUTH_COOKIE)
    site_key = settings.OPEN_DISCUSSIONS_DEFAULT_SITE_KEY

    try:
        # verify with JWT instead of JWT_DECODE_HANDLER because we want to decode expired tokens
        payload = jwt.decode(
            auth,
            api_settings.JWT_SECRET_KEY,
            # use a high leeway because we're interested in whether this token was ever valid
            leeway=timedelta(days=365),
            algorithms=[api_settings.JWT_ALGORITHM]
        )
        username = payload.get("username", None)
        site_key = payload.get("site_key", site_key)

    except jwt.InvalidTokenError:
        username = None

    site = AuthenticatedSite.objects.filter(key=site_key).first()

    if site is None:
        raise ImproperlyConfigured("Unable to find site for site key: '{}'".format(site_key))

    user_full_name = None
    profile_image_small = None

    if username is not None:
        user = User.objects.get(username=username)
        user_full_name = user.profile.name
        profile_image_small = user.profile.image_small

    js_settings = {
        "gaTrackingID": settings.GA_TRACKING_ID,
        "public_path": public_path(request),
        "max_comment_depth": settings.OPEN_DISCUSSIONS_MAX_COMMENT_DEPTH,
        "username": username,
        "user_full_name": user_full_name,
        "profile_image_small": profile_image_small,
        "authenticated_site": {
            "title": site.title,
            "base_url": site.base_url,
            "login_url": site.login_url,
            "session_url": site.session_url,
            "tos_url": site.tos_url,
        },
    }

    return render(request, "index.html", context={
        "js_settings_json": json.dumps(js_settings),
    })
