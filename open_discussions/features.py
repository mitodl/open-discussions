"""Discussions feature flags"""
from django.conf import settings

EMAIL_NOTIFICATIONS = 'EMAIL_NOTIFICATIONS'
FRONTPAGE_EMAIL_DIGESTS = 'FRONTPAGE_EMAIL_DIGESTS'


def is_enabled(name, default=False):
    """
    Returns True if the feature flag is enabled

    Args:
        name (str): feature flag name
        default (bool): default value if not set in settings

    Returns:
        bool: True if the feature flag is enabled
    """
    return settings.FEATURES.get(name, default)
