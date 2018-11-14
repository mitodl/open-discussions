"""Profile API"""
import tldextract

from channels.models import ChannelGroupRole
from profiles.models import (
    Profile,
    filter_profile_props,
    SITE_TYPE_OPTIONS,
    PERSONAL_SITE_TYPE,
)


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
    Get the list of channel names for which the user is a moderator, contributor, or subscriber

    Args:
        user(django.contrib.auth.models.User): the user to retrieve channel names for

    Returns:
        set of str: Channel names
    """
    return set(
        list(user.channelsubscription_set.values_list("channel__name", flat=True))
        + list(
            ChannelGroupRole.objects.filter(group__in=user.groups.all()).values_list(
                "channel__name", flat=True
            )
        )
    )


def get_site_type_from_url(url):
    """
    Gets a site type (as defined in profiles.models) from the given URL

    Args:
        url (str): A URL

    Returns:
        str: A string indicating the site type
    """
    no_fetch_extract = tldextract.TLDExtract(suffix_list_urls=False)
    extract_result = no_fetch_extract(url)
    domain = extract_result.domain.lower()
    if domain in SITE_TYPE_OPTIONS:
        return domain
    return PERSONAL_SITE_TYPE
