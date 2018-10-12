"""Embedly proxy API"""
import requests

from django.conf import settings

THUMBNAIL_URL = "thumbnail_url"


def get_embedly(url):
    """issue a request to embed.ly's embed API"""
    return requests.get(
        settings.EMBEDLY_EMBED_URL, params={"key": settings.EMBEDLY_KEY, "url": url}
    )
