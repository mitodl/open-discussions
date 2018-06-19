"""
open_discussions views
"""
import json
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.http import Http404, HttpResponse
from django.shortcuts import render
from django.urls import reverse
from rest_framework_jwt.settings import api_settings
from social_django.utils import load_strategy, load_backend

from open_discussions import features

from open_discussions.templatetags.render_bundle import public_path
from sites.models import AuthenticatedSite


User = get_user_model()


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the react app"""
    user = None
    auth = request.COOKIES.get(api_settings.JWT_AUTH_COOKIE)
    site_key = settings.OPEN_DISCUSSIONS_DEFAULT_SITE_KEY

    if request.user.is_authenticated:
        user = request.user
        username = request.user.username
    else:
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
            user = User.objects.get(username=username)

        except jwt.InvalidTokenError:
            username = None

    site = AuthenticatedSite.objects.filter(key=site_key).first()

    if site is None:
        raise ImproperlyConfigured("Unable to find site for site key: '{}'".format(site_key))

    user_full_name = None
    user_email = None

    if user:
        user_full_name = user.profile.name
        user_email = user.email
    js_settings = {
        "gaTrackingID": settings.GA_TRACKING_ID,
        "public_path": public_path(request),
        "max_comment_depth": settings.OPEN_DISCUSSIONS_MAX_COMMENT_DEPTH,
        "username": username,
        "user_full_name": user_full_name,
        "user_email": user_email,
        "authenticated_site": {
            "title": site.title,
            "base_url": site.base_url,
            "login_url": site.login_url,
            "session_url": site.session_url,
            "tos_url": site.tos_url,
        },
        "support_email": settings.EMAIL_SUPPORT,
        "is_authenticated": bool(request.user.is_authenticated),
        "profile_ui_enabled": features.is_enabled(features.PROFILE_UI),
        "allow_anonymous": features.is_enabled(features.ANONYMOUS_ACCESS),
        "allow_email_auth": features.is_enabled(features.EMAIL_AUTH),
    }

    return render(request, "index.html", context={
        "js_settings_json": json.dumps(js_settings),
    })


def saml_metadata(request):
    """ Display SAML configuration metadata as XML """
    if not features.is_enabled(features.SAML_AUTH):
        raise Http404("Page not found")
    complete_url = reverse('social:complete', args=("saml", ))
    saml_backend = load_backend(
        load_strategy(request),
        "saml",
        redirect_uri=complete_url,
    )
    metadata, _ = saml_backend.generate_metadata_xml()
    return HttpResponse(content=metadata, content_type='text/xml')
