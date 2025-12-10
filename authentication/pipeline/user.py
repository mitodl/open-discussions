"""Auth pipline functions for email authentication"""
import ulid
from django.conf import settings
from django.db import transaction
from social_core.backends.email import EmailAuth
from social_core.backends.saml import SAMLAuth
from social_core.exceptions import AuthException
from social_core.pipeline.partial import partial

from authentication.backends.micromasters import MicroMastersAuth
from authentication.exceptions import (
    InvalidPasswordException,
    RequirePasswordAndProfileException,
    RequirePasswordException,
    RequireProviderException,
    RequireRegistrationException,
)
from authentication.utils import SocialAuthState
from moira_lists.tasks import update_user_moira_lists
from open_discussions import features
from open_discussions.settings import SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME
from profiles import api as profile_api
from profiles.utils import update_full_name

# pylint: disable=keyword-arg-before-vararg


def validate_email_auth_request(
    strategy, backend, user=None, *args, **kwargs
):  # pylint: disable=unused-argument
    """Validates an auth request for email

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user

    """
    if backend.name != EmailAuth.name:
        return {}

    # if there's a user, force this to be a login
    if user is not None:
        return {"flow": SocialAuthState.FLOW_LOGIN}

    return {}


def get_username(
    strategy, backend, user=None, *args, **kwargs
):  # pylint: disable=unused-argument
    """Gets the username for a user

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

    return {"username": username}


@partial
def require_password_and_profile_via_email(
    strategy, backend, user=None, flow=None, current_partial=None, *args, **kwargs
):  # pylint: disable=unused-argument
    """Sets a new user's password and profile

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        flow (str): the type of flow (login or register)
        current_partial (Partial): the partial for the step in the pipeline

    Raises:
        RequirePasswordAndProfileException: if the user hasn't set password or name

    """
    if backend.name != EmailAuth.name or flow != SocialAuthState.FLOW_REGISTER:
        return {}

    data = strategy.request_data()
    profile = user.profile

    with transaction.atomic():
        if "name" in data:
            profile = profile_api.ensure_profile(user, {"name": data["name"]})

        if "password" in data:
            user.set_password(data["password"])
            user.save()

    if not user.password or not profile.name:
        raise RequirePasswordAndProfileException(backend, current_partial)

    return {"user": user, "profile": profile or user.profile}


@partial
def require_profile_update_user_via_saml(
    strategy, backend, user=None, is_new=False, *args, **kwargs
):  # pylint: disable=unused-argument
    """Sets a new user's password and profile, and updates the user first and last names.
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

    with transaction.atomic():
        try:
            update_full_name(
                user,
                kwargs["response"]["attributes"][SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME][
                    0
                ],
            )
        except (KeyError, IndexError):
            # No name information passed, skipping
            pass

        profile = profile_api.ensure_profile(user, {"name": user.get_full_name()})

    return {"user": user, "profile": profile}


@partial
def validate_password(
    strategy, backend, user=None, flow=None, current_partial=None, *args, **kwargs
):  # pylint: disable=unused-argument
    """Validates a user's password for login

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        flow (str): the type of flow (login or register)
        current_partial (Partial): the partial for the step in the pipeline

    Raises:
        RequirePasswordException: if the user password is invalid

    """
    if backend.name != EmailAuth.name or flow != SocialAuthState.FLOW_LOGIN:
        return {}

    data = strategy.request_data()

    if user is None:
        raise RequireRegistrationException(backend, current_partial)

    if "password" not in data:
        raise RequirePasswordException(backend, current_partial)

    password = data["password"]

    if not user or not user.check_password(password):
        raise InvalidPasswordException(backend, current_partial)

    return {}


# NOTE: This pipeline function should NOT be decorated with the @partial decorator. That could
# present a potential security risk.
def require_touchstone_login(
    strategy, backend, flow=None, **kwargs
):  # pylint: disable=unused-argument
    """If the user is attempting to log in via email and has authenticated via Touchstone/SAML, require
    them to log in that way.

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        flow (str): the type of flow (login or register)

    """
    if (
        backend.name != EmailAuth.name
        or flow != SocialAuthState.FLOW_LOGIN
        or not features.is_enabled(features.SAML_AUTH)
    ):
        return {}

    data = strategy.request_data()
    email = data.get("email")
    if not email:
        return {}

    user_storage = strategy.storage.user
    saml_auth = user_storage.get_social_auth(
        SAMLAuth.name, f"{settings.SOCIAL_AUTH_DEFAULT_IDP_KEY}:{email}"
    )
    if saml_auth:
        raise RequireProviderException(backend, saml_auth)
    return {}


def require_micromasters_provider(
    strategy, backend, user=None, flow=None, **kwargs
):  # pylint: disable=unused-argument
    """If the user exists and only has a micromasters auth, require them to login that way

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        flow (str): the type of flow (login or register)

    """
    # only do this check if the user is attempting an email login
    if (
        backend.name != EmailAuth.name
        or flow != SocialAuthState.FLOW_LOGIN
        or user is None
    ):
        return {}

    user_storage = strategy.storage.user

    # if the user only has one social auth and it is MicroMasters, prompt them to login via that method
    social_auths = user_storage.get_social_auth_for_user(user)
    if len(social_auths) != 1:
        return {}

    social_auth = social_auths[0]
    if social_auth.provider == MicroMastersAuth.name:
        raise RequireProviderException(backend, social_auth)
    return {}


def forbid_hijack(strategy, backend, **kwargs):  # pylint: disable=unused-argument
    """Forbid an admin user from trying to login/register while hijacking another user

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate

    """
    # As first step in pipeline, stop a hijacking admin from going any further
    if strategy.session_get("is_hijacked_user"):
        raise AuthException("You are hijacking another user, don't try to login again")
    return {}


def update_managed_channel_memberships(
    strategy, backend, user=None, **kwargs
):  # pylint: disable=unused-argument
    """Update a user's managed channel memberships (deprecated - no-op)

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user

    """
    return {}


def update_moira_lists(
    strategy, backend, user=None, **kwargs
):  # pylint: disable=unused-argument
    """Update a user's moira lists

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user

    """
    if features.is_enabled(features.MOIRA) and user and user.is_active:
        update_user_moira_lists.delay(user.id, update_memberships=True)
    return {}
