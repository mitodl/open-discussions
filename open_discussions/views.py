"""
open_discussions views
"""
import json

from django.conf import settings
from django.shortcuts import render

from open_discussions.templatetags.render_bundle import public_path


def index(request):
    """
    The index view. Display available programs
    """

    js_settings = {
        "gaTrackingID": settings.GA_TRACKING_ID,
        "public_path": public_path(request),
    }

    return render(request, "index.html", context={
        "js_settings_json": json.dumps(js_settings),
    })
