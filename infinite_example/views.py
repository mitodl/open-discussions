"""
infinite_example views
"""
from django.shortcuts import render
from django.conf import settings
from course_catalog.permissions import is_staff_list_editor

from moira_lists.moira_api import is_public_list_editor
from open_discussions.permissions import is_admin_user


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the example app"""

    user = request.user

    js_settings = {
        "ocw_next_base_url": settings.OCW_NEXT_BASE_URL,
        "search_page_size": settings.OPENSEARCH_DEFAULT_PAGE_SIZE,
        "user": {
            "id": user.id,
            "is_authenticated": bool(user.is_authenticated),
            "is_public_list_editor": user.is_authenticated
            and is_public_list_editor(user),
            "is_staff_list_editor": user.is_authenticated
            and (is_admin_user(request) or is_staff_list_editor(request)),
        },
        "ckeditor_upload_url": settings.CKEDITOR_UPLOAD_URL,
        "environment": settings.ENVIRONMENT,
        "sentry_dsn": settings.SENTRY_DSN,
        "release_version": settings.VERSION,
    }

    return render(request, "example.html", context=dict(js_settings=js_settings))
