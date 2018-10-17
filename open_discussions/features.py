"""Discussions feature flags"""
from functools import wraps
from django.conf import settings

EMAIL_NOTIFICATIONS = "EMAIL_NOTIFICATIONS"
FRONTPAGE_EMAIL_DIGESTS = "FRONTPAGE_EMAIL_DIGESTS"
COMMENT_NOTIFICATIONS = "COMMENT_NOTIFICATIONS"
ANONYMOUS_ACCESS = "ANONYMOUS_ACCESS"
INDEX_UPDATES = "INDEX_UPDATES"
EMAIL_AUTH = "EMAIL_AUTH"
SAML_AUTH = "SAML_AUTH"
PROFILE_UI = "PROFILE_UI"
USE_NEW_BRANDING = "USE_NEW_BRANDING"
SEARCH_UI = "SEARCH_UI"


def is_enabled(name, default=None):
    """
    Returns True if the feature flag is enabled

    Args:
        name (str): feature flag name
        default (bool): default value if not set in settings

    Returns:
        bool: True if the feature flag is enabled
    """
    return settings.FEATURES.get(
        name, default or settings.OPEN_DISCUSSIONS_FEATURES_DEFAULT
    )


def if_feature_enabled(name, default=None):
    """
    Wrapper that results in a no-op if the given feature isn't enabled, and otherwise
    runs the wrapped function as normal.

    Args:
        name (str): Feature flag name
        default (bool): default value if not set in settings
    """

    def if_feature_enabled_inner(func):  # pylint: disable=missing-docstring
        @wraps(func)
        def wrapped_func(*args, **kwargs):  # pylint: disable=missing-docstring
            if not is_enabled(name, default):
                # If the given feature name is not enabled, do nothing (no-op).
                return
            else:
                # If the given feature name is enabled, call the function and return as normal.
                return func(*args, **kwargs)

        return wrapped_func

    return if_feature_enabled_inner
