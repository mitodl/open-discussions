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
from profiles.models import SOCIAL_SITE_NAME_MAP


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the react app"""
    if request.META.get("HTTP_USER_AGENT", "").startswith("facebookexternalhit"):
        return render(
            request,
            "social.html",
            context={
                "url": request.build_absolute_uri(),
                "description_value": "MIT Open Learning's discussion platform",
            },
        )

    username = None
    user_full_name = None
    user_email = None
    user_is_superuser = False
    user_id = None

    if request.user.is_authenticated:
        user = request.user
        username = user.username
        user_full_name = user.profile.name
        user_email = user.email
        user_is_superuser = user.is_superuser
        user_id = user.id

    site = get_default_site()

    article_ui_enabled = (
        features.is_enabled(features.ARTICLE_UI)
        if settings.CKEDITOR_ENVIRONMENT_ID
        and settings.CKEDITOR_SECRET_KEY
        and settings.CKEDITOR_UPLOAD_URL
        else False
    )

    livestream_ui_enabled = (
        features.is_enabled(features.LIVESTREAM_UI)
        if settings.LIVESTREAM_ACCOUNT_ID and settings.LIVESTREAM_SECRET_KEY
        else False
    )

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
        "user_id": user_id,
        "is_admin": user_is_superuser,
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
        "allow_saml_auth": features.is_enabled(features.SAML_AUTH),
        "allow_related_posts_ui": features.is_enabled(features.RELATED_POSTS_UI),
        "embedlyKey": settings.EMBEDLY_KEY,
        "recaptchaKey": settings.RECAPTCHA_SITE_KEY,
        "search_page_size": settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE,
        "search_min_length": settings.ELASTICSEARCH_MIN_QUERY_SIZE,
        "accepted_social_sites": list(SOCIAL_SITE_NAME_MAP.values()),
        "article_ui_enabled": article_ui_enabled,
        "ckeditor_upload_url": settings.CKEDITOR_UPLOAD_URL,
        "algolia_appId": settings.ALGOLIA_APP_ID,
        "algolia_apiKey": settings.ALGOLIA_API_KEY,
        "course_ui_enabled": features.is_enabled(features.COURSE_UI),
        "file_search_enabled": features.is_enabled(features.COURSE_FILE_SEARCH),
        "livestream_ui_enabled": livestream_ui_enabled,
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
