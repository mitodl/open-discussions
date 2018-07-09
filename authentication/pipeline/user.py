"""Auth pipline functions for email authentication"""
import ulid
from social_core.backends.email import EmailAuth
from social_core.backends.saml import SAMLAuth
from social_core.pipeline.partial import partial

from authentication.exceptions import (
    InvalidPasswordException,
    RequirePasswordException,
    RequirePasswordAndProfileException,
    RequireRegistrationException,
)
from authentication.utils import SocialAuthState
from open_discussions.settings import SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME
from profiles.utils import update_full_name


def validate_email_auth_request(strategy, backend, user=None, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Validates an auth request for email

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
    """
    if backend.name != EmailAuth.name:
        return {}

    # if there's a user, force this to be a login
    if user is not None:
        return {
            'flow': SocialAuthState.FLOW_LOGIN,
        }

    return {}


def get_username(strategy, backend, user=None, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Gets the username for a user

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
    """
    username = None

    if not user:
        username = ulid.new().str
    else:
        username = strategy.storage.user.get_username(user)

    return {'username': username}


@partial
def require_password_and_profile_via_email(
        strategy, backend, user=None, flow=None, current_partial=None, *args, **kwargs
):  # pylint: disable=unused-argument
    """
    Sets a new user's password and profile

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        is_register (bool): True if the user is registering

    Raises:
        RequirePasswordAndProfileException: if the user hasn't set password or name
    """
    if backend.name != EmailAuth.name or flow != SocialAuthState.FLOW_REGISTER:
        return {}

    data = strategy.request_data()
    profile = user.profile

    if 'name' in data:
        profile.name = data['name']
        profile.save()

    if 'password' in data:
        user.set_password(data['password'])
        user.save()

    if not user.password or not user.profile.name:
        raise RequirePasswordAndProfileException(backend, current_partial)

    return {
        'user': user,
        'profile': profile or user.profile,
    }


@partial
def require_profile_update_user_via_saml(
        strategy, backend, user=None, is_new=False, *args, **kwargs
):  # pylint: disable=unused-argument
    """
    Sets a new user's password and profile, and updates the user first and last names.
    Touchstone only returns DisplayName, which is the full name, and that is what the
    user first_name is initially set to.

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        is_new (bool): True if the user just got created
    """
    if backend.name != SAMLAuth.name or not is_new:
        return {}

    try:
        update_full_name(user, kwargs['response']['attributes'][SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME][0])
    except (KeyError, IndexError):
        # No name information passed, skipping
        pass

    profile = user.profile
    profile.name = user.get_full_name()
    profile.save()

    return {
        'user': user,
        'profile': profile,
    }


@partial
def validate_password(
        strategy, backend, user=None, flow=None, current_partial=None, *args, **kwargs
):  # pylint: disable=unused-argument
    """
    Validates a user's password for login

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        is_login (bool): True if the request is a login

    Raises:
        RequirePasswordException: if the user password is invalid
    """
    if backend.name != EmailAuth.name or flow != SocialAuthState.FLOW_LOGIN:
        return {}

    data = strategy.request_data()

    if user is None:
        raise RequireRegistrationException(backend, current_partial)

    if 'password' not in data:
        raise RequirePasswordException(backend, current_partial)

    password = data['password']

    if not user or not user.check_password(password):
        raise InvalidPasswordException(backend, current_partial)

    return {}
