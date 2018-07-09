"""Authentication api"""
import logging

from django.contrib.auth import get_user_model
from django.db import transaction

from channels import api as channels_api
from notifications import api as notifications_api
from profiles import api as profile_api

User = get_user_model()

log = logging.getLogger()


def create_user(username, email, profile_data=None):
    """
    Ensures the user exists

    Args:
        email (str): the user's email
        profile (dic): the profile data for the user

    Returns:
        User: the user's profile
    """
    with transaction.atomic():
        user, _ = User.objects.get_or_create(email=email, defaults={
            'username': username,
        })

        profile_api.ensure_profile(user, profile_data=profile_data)
        notifications_api.ensure_notification_settings(user)

    try:
        # this could fail if the reddit backend is down
        # but we don't want it to hard-fail the user creation process
        channels_api.get_or_create_auth_tokens(user)
    except:  # pylint: disable=bare-except
        log.exception('Exception trying to create auth tokens')

    return user
