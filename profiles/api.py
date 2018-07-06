"""Profile API"""
import hashlib

import requests

from profiles.models import (
    IMAGE_MEDIUM_MAX_DIMENSION,
    IMAGE_SMALL_MAX_DIMENSION,
    Profile,
    filter_profile_props,
)

GRAVATAR_IMAGE_URL = "https://www.gravatar.com/avatar/{}.jpg"


def ensure_profile(user, profile_data=None):
    """
    Ensures the user has a profile

    Args:
        user (User): the user to ensure a profile for
        profile (dic): the profile data for the user

    Returns:
        Profile: the user's profile
    """
    defaults = filter_profile_props(profile_data) if profile_data else {}

    # if we weren't provided an image for the new user, fetch defaults from gravatar
    if 'image' not in defaults and 'image_file' not in defaults:
        defaults.update(_get_gravatar_urls_properties(user))

    profile, _ = Profile.objects.get_or_create(user=user, defaults=defaults)
    return profile


def _get_gravatar_urls_properties(user):
    """
    Query gravatar for an image and return those image properties

    Args:
        user (User): the user to compute gravatar image urls for

    Returns:
        dict: additional properties for the profile
    """
    gravatar_hash = hashlib.md5(user.email.lower().encode('utf-8')).hexdigest()
    gravatar_image_url = GRAVATAR_IMAGE_URL.format(gravatar_hash)
    if requests.get("{}?d=404".format(gravatar_image_url), timeout=5).status_code == 200:
        return {
            'image': gravatar_image_url,
            'image_small': '{}?s={}'.format(gravatar_image_url, IMAGE_SMALL_MAX_DIMENSION),
            'image_medium': '{}?s={}'.format(gravatar_image_url, IMAGE_MEDIUM_MAX_DIMENSION)
        }

    return {}
