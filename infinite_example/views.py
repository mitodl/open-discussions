"""
infinite_example views
"""
from django.shortcuts import render
from django.conf import settings

from moira_lists.moira_api import is_public_list_editor


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the example app"""

    user = request.user

    js_settings = {
        "embedlyKey": settings.EMBEDLY_KEY,
        "ocw_next_base_url": settings.OCW_NEXT_BASE_URL,
        "search_page_size": settings.OPENSEARCH_DEFAULT_PAGE_SIZE,
        "user": {
            "id": user.id,
            "is_authenticated": bool(user.is_authenticated),
            "is_public_list_editor": user.is_authenticated
            and is_public_list_editor(user),
        },
    }

    return render(request, "example.html", context=dict(js_settings=js_settings))
