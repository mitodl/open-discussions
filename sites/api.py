"""Sites API"""
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from sites.models import AuthenticatedSite


def get_default_site():
    """
    Returns the default configured authenticated sites

    Raises:
        ImproperlyConfigured: if the site is not configured correctly

    Returns:
        AuthenticatedSite: the default one
    """
    default_site_key = settings.OPEN_DISCUSSIONS_DEFAULT_SITE_KEY
    try:
        return AuthenticatedSite.objects.get(key=default_site_key)
    except AuthenticatedSite.DoesNotExist as exc:
        raise ImproperlyConfigured(
            "Unable to find site for site key: '{}'".format(default_site_key)
        ) from exc
