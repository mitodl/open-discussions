"""
open_discussions views
"""
from django.conf import settings
from django.http import (
    Http404,
    HttpResponse,
    HttpResponsePermanentRedirect,
    HttpResponseNotFound,
    HttpResponseForbidden,
    HttpResponseBadRequest,
)
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from social_django.utils import load_strategy, load_backend

from channels.models import Post
from course_catalog.permissions import is_staff_list_editor
from moira_lists.moira_api import is_public_list_editor
from open_discussions import features

from profiles.models import SOCIAL_SITE_NAME_MAP


def _render_app(request, initial_state=None):  # pylint:disable=unused-argument
    """Render the app with settings"""
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
    user_public_list_editor = False  # User can make public user lists
    user_staff_list_editor = False  # User can make staff lists

    if request.user.is_authenticated:
        user = request.user
        username = user.username
        user_full_name = user.profile.name
        user_email = user.email
        user_is_superuser = user.is_superuser
        user_id = user.id
        user_public_list_editor = is_public_list_editor(user)
        user_staff_list_editor = is_staff_list_editor(request)

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
        "gaGTrackingID": settings.GA_G_TRACKING_ID,
        "environment": settings.ENVIRONMENT,
        "sentry_dsn": settings.SENTRY_DSN,
        "release_version": settings.VERSION,
        "site_url": settings.SITE_BASE_URL,
        "max_comment_depth": settings.OPEN_DISCUSSIONS_MAX_COMMENT_DEPTH,
        "username": username,
        "user_full_name": user_full_name,
        "user_email": user_email,
        "user_id": user_id,
        "is_admin": user_is_superuser,
        "is_public_list_editor": user_public_list_editor,
        "is_staff_list_editor": user_staff_list_editor,
        "authenticated_site": {
            "title": settings.OPEN_DISCUSSIONS_TITLE,
            "base_url": settings.SITE_BASE_URL,
            "tos_url": settings.OPEN_DISCUSSIONS_TOS_URL,
        },
        "support_email": settings.EMAIL_SUPPORT,
        "is_authenticated": bool(request.user.is_authenticated),
        "profile_ui_enabled": features.is_enabled(features.PROFILE_UI),
        "allow_saml_auth": features.is_enabled(features.SAML_AUTH),
        "allow_related_posts_ui": features.is_enabled(features.RELATED_POSTS_UI),
        "embedlyKey": settings.EMBEDLY_KEY,
        "recaptchaKey": settings.RECAPTCHA_SITE_KEY,
        "search_page_size": settings.OPENSEARCH_DEFAULT_PAGE_SIZE,
        "search_min_length": settings.OPENSEARCH_MIN_QUERY_SIZE,
        "accepted_social_sites": list(SOCIAL_SITE_NAME_MAP.values()),
        "article_ui_enabled": article_ui_enabled,
        "ckeditor_upload_url": settings.CKEDITOR_UPLOAD_URL,
        "course_ui_enabled": features.is_enabled(features.COURSE_UI),
        "file_search_enabled": features.is_enabled(features.COURSE_FILE_SEARCH),
        "livestream_ui_enabled": livestream_ui_enabled,
        "ocw_next_base_url": settings.OCW_NEXT_BASE_URL,
    }

    return render(request, "react.html", context=dict(js_settings=js_settings))


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the react app"""
    return _render_app(request)


def channel_post(request, **kwargs):
    """Render a channel post's page as long as it isn't removed"""
    post_id = kwargs.get("post_id", None)
    if not post_id:
        raise Http404("No post specified")

    post = get_object_or_404(Post, post_id=post_id)
    if post.removed and (
        request.user.is_anonymous
        or not (
            request.channel_api.is_moderator(post.channel.name, request.user.username)
        )
    ):
        raise Http404("Post doesn't exist")

    return _render_app(request)


def handle_400(request, exception=None):  # pylint:disable=unused-argument
    """400 error handler"""
    return HttpResponseBadRequest(
        _render_app(request, initial_state={"server": {"statusCode": 400}})
    )


def handle_403(request, exception=None):  # pylint:disable=unused-argument
    """403 error handler"""
    return HttpResponseForbidden(
        _render_app(request, initial_state={"server": {"statusCode": 403}})
    )


def handle_404(request, exception=None):  # pylint:disable=unused-argument
    """404 error handler"""
    return HttpResponseNotFound(
        _render_app(request, initial_state={"server": {"statusCode": 404}})
    )


def saml_metadata(request):
    """Display SAML configuration metadata as XML"""
    if not features.is_enabled(features.SAML_AUTH):
        raise Http404("Page not found")
    complete_url = reverse("social:complete", args=("saml",))
    saml_backend = load_backend(
        load_strategy(request), "saml", redirect_uri=complete_url
    )
    metadata, _ = saml_backend.generate_metadata_xml()
    return HttpResponse(content=metadata, content_type="text/xml")


def channel_redirect(request):
    """Redirect all URL's starting with `channel/` to `c/`"""
    return HttpResponsePermanentRedirect(request.path.replace("channel/", "c/", 1))
