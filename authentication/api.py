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
        User: the user's profile
    """
    defaults = {}

    if user_extra is not None:
        defaults.update(user_extra)

    # this takes priority over a passed in value
    defaults.update({
        'username': username,
    })

    with transaction.atomic():
        user, _ = User.objects.get_or_create(email=email, defaults=defaults)

        profile_api.ensure_profile(user, profile_data=profile_data)
        notifications_api.ensure_notification_settings(user)

    try:
        # this could fail if the reddit backend is down
        # but we don't want it to hard-fail the user creation process
        channels_api.get_or_create_auth_tokens(user)
    except:  # pylint: disable=bare-except
        log.exception('Exception trying to create auth tokens')

    return user


def create_micromasters_social_auth(user):
    """
    Creates a MicroMasters social auth for a user

    Args:
        user(User): user to create the auth for

    Returns:
        UserSocialAuth: the created social auth record
    """
    # avoid a circular import
    from social_django.utils import STORAGE, STRATEGY, load_backend
    strategy = get_strategy(STRATEGY, STORAGE)
    storage = strategy.storage
    backend = load_backend(strategy, MicroMastersAuth.name, None)
    try:
        social = storage.user.create_social_auth(user, user.username, MicroMastersAuth.name)

        extra_data = backend.extra_data(user, user.username, {
            'email': user.email,
            'username': str(user.username),
        }, {})
        social.set_extra_data(extra_data)
        return social
    except IntegrityError:
        # if the user already has a social auth for MM, we don't want to fail
        # so just return the existing one
        return storage.user.get_social_auth_for_user(user, provider=MicroMastersAuth.name)
