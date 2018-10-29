"""
open_discussions views
"""
import json

from django.conf import settings
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from django.shortcuts import render
from django.urls import reverse
from raven.contrib.django.raven_compat.models import client as sentry
from social_django.utils import load_strategy, load_backend

from open_discussions import features

from open_discussions.templatetags.render_bundle import public_path
from sites.api import get_default_site


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the react app"""
    user = None
    username = None
    user_full_name = None
    user_email = None

    if request.user.is_authenticated:
        user = request.user
        username = request.user.username
        user_full_name = user.profile.name
        user_email = user.email

    site = get_default_site()

    js_settings = {
        "gaTrackingID": settings.GA_TRACKING_ID,
        "environment": settings.ENVIRONMENT,
        "sentry_dsn": sentry.get_public_dsn(),
        "release_version": settings.VERSION,
        "public_path": public_path(request),
        "site_url": settings.SITE_BASE_URL,
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
        "allow_saml_auth": features.is_enabled(features.SAML_AUTH),
        "use_new_branding": features.is_enabled(features.USE_NEW_BRANDING),
        "embedlyKey": settings.EMBEDLY_KEY,
        "recaptchaKey": settings.RECAPTCHA_SITE_KEY,
        "widgetListId": 1,
        "widgetFrameworkApiBase": settings.SITE_BASE_URL + 'api/v1/',
    }

    return render(
        request, "index.html", context={"js_settings_json": json.dumps(js_settings)}
    )


def saml_metadata(request):
    """ Display SAML configuration metadata as XML """
    if not features.is_enabled(features.SAML_AUTH):
        raise Http404("Page not found")
    complete_url = reverse("social:complete", args=("saml",))
    saml_backend = load_backend(
        load_strategy(request), "saml", redirect_uri=complete_url
    )
    metadata, _ = saml_backend.generate_metadata_xml()
    return HttpResponse(content=metadata, content_type="text/xml")


def channel_redirect(request):
    """ Redirect all URL's starting with `channel/` to `c/` """
    return HttpResponsePermanentRedirect(request.path.replace("channel/", "c/", 1))
