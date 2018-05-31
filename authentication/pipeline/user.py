"""Auth pipline functions for email authentication"""
from django.shortcuts import render
import ulid
from social_core.backends.email import EmailAuth
from social_core.backends.saml import SAMLAuth
from social_core.exceptions import AuthForbidden
from social_core.pipeline.partial import partial

from channels import api as channel_api
from notifications import api as notifications_api
from authentication.forms import (
    AUTH_TYPE_LOGIN,
    AUTH_TYPE_REGISTER,
    LoginForm,
    PasswordAndProfileForm,
)
from open_discussions.settings import SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME
from profiles.models import Profile


def validate_email_auth_request(strategy, backend, user=None, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Validates an auth request for email

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
    """
    if backend.name != EmailAuth.name:
        return

    auth_type = strategy.request_data().get('auth_type', None)

    # if the user exists force a login, regardless of auth_type value
    if user or (auth_type == AUTH_TYPE_LOGIN):
        return {
            'is_register': False,
            'is_login': True,
        }
    elif auth_type == AUTH_TYPE_REGISTER:
        return {
            'is_register': True,
            'is_login': False,
        }
    else:
        raise AuthForbidden(backend)


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
        strategy, backend, user=None, is_register=False, current_partial=None, *args, **kwargs
):  # pylint: disable=unused-argument
    """
    Sets a new user's password and profile

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        is_new (bool): True if the user just got created
    """
    if backend.name != EmailAuth.name or not is_register:
        return

    if strategy.request.method == 'POST':
        data = strategy.request_data()
        form = PasswordAndProfileForm(data)
        if form.is_valid():
            password = form.cleaned_data['password']
            name = form.cleaned_data['fullname']
            user.set_password(password)
            user.save()
            profile, _ = Profile.objects.update_or_create(
                user=user,
                defaults={
                    'name': name,
                },
            )
            # user has password and profile now so return those updated values to the pipeline
            return {
                'user': user,
                'profile': profile,
            }
    else:
        form = PasswordAndProfileForm()

    return render(strategy.request, 'profile.html', {
        'form': form,
        'partial_token': current_partial.token,
    })


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
        is_register (bool): True if the user just got registered
    """
    if backend.name != SAMLAuth.name or not is_new:
        return

    try:
        update_full_name(user, kwargs['response']['attributes'][SOCIAL_AUTH_SAML_IDP_ATTRIBUTE_NAME][0])
    except (KeyError, IndexError):
        # No name information passed, skipping
        pass

    profile, _ = Profile.objects.update_or_create(
        user=user,
        defaults={
            'name': user.get_full_name()
        },
    )

    return {
        'user': user,
        'profile': profile,
    }


def validate_password(
        strategy, backend, user=None, is_login=False, *args, **kwargs
):  # pylint: disable=unused-argument
    """
    Validates a user's password for login

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        user (User): the current user
        is_login (bool): True if the request is a login
    """
    data = strategy.request_data()

    if backend.name != EmailAuth.name or not is_login:
        return

    form = LoginForm(data)

    if not form.is_valid():
        return render(strategy.request, 'login.html', context={
            'form': form,
        })

    password = form.cleaned_data['password']
    if not user or not user.check_password(password):
        raise AuthForbidden(backend)


def initialize_user(user, is_new=False, *args, **kwargs):  # pylint: disable=unused-argument
    """
    Performs first-time initialization of the user

    Args:
        user (User): the current user
        is_new (bool): True if the user just got created
    """
    if not is_new:
        return

    notifications_api.ensure_notification_settings(user)

    channel_api.get_or_create_auth_tokens(user)


def update_full_name(user, name):
    """
    Update the first and last names of a user.

    Args:
        user(User): The user to modify.
        name(str): The full name of the user.
    """
    name_parts = name.split(' ')
    user.first_name = name_parts[0][:30]
    if len(name_parts) > 1:
        user.last_name = ' '.join(name_parts[1:])[:30]
    user.save()
