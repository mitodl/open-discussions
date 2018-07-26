"""Profile API"""
from profiles.models import (
    Profile,
    filter_profile_props
)


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

    profile, _ = Profile.objects.get_or_create(user=user, defaults=defaults)
    return profile
