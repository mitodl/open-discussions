"""Profile API"""
import tldextract

from django.db import transaction

from channels.models import ChannelGroupRole
from profiles.models import (
    Profile,
    filter_profile_props,
    SITE_TYPE_OPTIONS,
    PERSONAL_SITE_TYPE,
)
from search import search_index_helpers


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

    profile, _ = Profile.objects.update_or_create(user=user, defaults=defaults)

    after_profile_created_or_updated(profile)

    return profile


def after_profile_created_or_updated(profile):
    """
    Operations that should be run after the profile has been created or updated

    Args:
        profile (profiles.models.Profile): the profile that was created or updated
    """

    def _after_profile_created_or_updated():
        """
        Operations that should be run after the profile create or update is committed
        """
        search_index_helpers.upsert_profile(profile.id)
        search_index_helpers.update_author_posts_comments(profile.id)

    # this will either get called when the outermost transaction commits or otherwise immediately
    # this avoids race conditions where the async tasks may not see the record or the updated values
    transaction.on_commit(_after_profile_created_or_updated)


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


def get_channel_join_dates(user):
    """
    Get the list of channels and the dates that the user joined them

    Args:
        user(django.contrib.auth.models.User): the user to retrieve channel names for

    Returns:
        set of (str: Channel names, datetime: when they joined)
    """
    names_and_dates = list(
        user.channelsubscription_set.values_list("channel__name", "created_on")
    ) + list(
        ChannelGroupRole.objects.filter(group__in=user.groups.all()).values_list(
            "channel__name", "created_on"
        )
    )

    output = {}
    for name, joined in names_and_dates:
        if name not in output or joined < output[name]:
            output[name] = joined
    return [(k, v) for k, v in output.items()]


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
