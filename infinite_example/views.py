"""
infinite_example views
"""
from django.shortcuts import render
from django.conf import settings


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the example app"""
    js_settings = {
        "embedlyKey": settings.EMBEDLY_KEY,
        "ocw_next_base_url": settings.OCW_NEXT_BASE_URL,
        "search_page_size": settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE,
    }

    return render(request, "example.html", context=dict(js_settings=js_settings))
