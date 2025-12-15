"""Embedly proxy API"""
import requests

from django.conf import settings

THUMBNAIL_URL = "thumbnail_url"


def get_embedly_summary(url):
    """issue a request to embed.ly's oembed API endpoint"""
    return requests.get(
        settings.EMBEDLY_EMBED_URL,
        params={"key": settings.EMBEDLY_KEY, "url": url},
        timeout=settings.REQUESTS_TIMEOUT,
    )


def get_embedly_content(url):
    """issue a request to embed.ly's extract API endpoint"""
    return requests.get(
        settings.EMBEDLY_EXTRACT_URL,
        params={"key": settings.EMBEDLY_KEY, "url": url},
        timeout=settings.REQUESTS_TIMEOUT,
    )
