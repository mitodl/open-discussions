"""Profile API"""
import tldextract

from django.db import transaction

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

    # this will either get called when the outermost transaction commits or otherwise immediately
    # this avoids race conditions where the async tasks may not see the record or the updated values
    transaction.on_commit(_after_profile_created_or_updated)


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
