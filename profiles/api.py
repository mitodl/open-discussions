"""Profile API"""
from channels.models import ChannelGroupRole
from profiles.models import Profile, filter_profile_props


def ensure_profile(user, profile_data=None):
    """
    Ensures the user has a profile

    Args:
        user (User): the user to ensure a profile for
        profile_data (dict): the profile data for the user

    Returns:
        Profile: the user's profile
    """
    defaults = filter_profile_props(profile_data) if profile_data else {}

    profile, _ = Profile.objects.get_or_create(user=user, defaults=defaults)
    return profile


def get_channels(user):
    """
    Get the set of channel names for which the user is a moderator or contributor

    Args:
        user(django.contrib.auth.models.User): the user to retrieve channel names for

    Returns:
        set of str: Channel names
    """
    return set(
        ChannelGroupRole.objects.filter(group__in=user.groups.all()).values_list(
            "channel__name", flat=True
        )
    )
