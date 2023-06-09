"""livestream API"""
import requests

from django.conf import settings


def get_upcoming_events():
    """issue a request to get upcoming events on our account"""
    return requests.get(
        f"https://livestreamapis.com/v3/accounts/{settings.LIVESTREAM_ACCOUNT_ID}/upcoming_events",
        auth=(settings.LIVESTREAM_SECRET_KEY, ""),
        timeout=settings.REQUESTS_TIMEOUT,
    )
