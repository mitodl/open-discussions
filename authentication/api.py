"""Authentication api"""
import logging

from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from social_core.utils import get_strategy

from authentication.backends.micromasters import MicroMastersAuth
from channels import api as channels_api
from notifications import api as notifications_api
from profiles import api as profile_api

User = get_user_model()

log = logging.getLogger()


def create_user(username, email, profile_data=None, user_extra=None):
    """
    Ensures the user exists

    Args:
        email (str): the user's email
        profile (dic): the profile data for the user

    Returns:
        User: the user
    """
    defaults = {}

    if user_extra is not None:
        defaults.update(user_extra)

    # this takes priority over a passed in value
    defaults.update({"username": username})

    with transaction.atomic():
        user, _ = User.objects.get_or_create(email=email, defaults=defaults)

        profile_api.ensure_profile(user, profile_data=profile_data)
        notifications_api.ensure_notification_settings(
            user, skip_moderator_setting=True
        )

        # this could fail if the reddit backend is down
        # so if it fails we want to rollback this entire transaction
        channels_api.get_or_create_auth_tokens(user)

    return user


def create_or_update_micromasters_social_auth(user, uid, details):
    """
    Creates or updates MicroMasters social auth for a user

    Args:
        user (User): user to create the auth for
        uid (str): the micromasters username of the user
        details (dict): additional details

    Returns:
        UserSocialAuth: the created social auth record
    """
    # avoid a circular import
    from social_django.utils import STORAGE, STRATEGY, load_backend

    strategy = get_strategy(STRATEGY, STORAGE)
    storage = strategy.storage
    backend = load_backend(strategy, MicroMastersAuth.name, None)
    try:
        social = storage.user.create_social_auth(user, uid, MicroMastersAuth.name)
    except IntegrityError:
        # if the user already has a social auth for MM, we don't want to fail
        # so just use the existing one
        social = (
            storage.user.get_social_auth_for_user(user, provider=MicroMastersAuth.name)
            .filter(uid=uid)
            .first()
        )

    # update metadata
    extra_data = backend.extra_data(user, uid, {"username": uid}, details)
    social.set_extra_data(extra_data)
    return social
