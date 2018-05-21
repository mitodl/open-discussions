"""API for email verifications"""
from urllib.parse import quote_plus

from django.conf import settings
from django.urls import reverse

from mail import api
from authentication.forms import AUTH_TYPE_REGISTER

VERIFICATION_TEMPLATE_NAME = 'verification'


def send_verification_email(strategy, backend, code, partial_token):  # pylint: disable=unused-argument
    """
    Sends a verification email for python-social-auth

    Args:
        strategy (social_django.strategy.DjangoStrategy): the strategy used to authenticate
        backend (social_core.backends.base.BaseAuth): the backend being used to authenticate
        code (social_django.models.Code): the confirmation code used to confirm the email address
        partial_token (str): token used to resume a halted pipeline
    """
    url = '{}?verification_code={}&auth_type={}'.format(
        strategy.build_absolute_uri(
            reverse('social:complete', args=(backend.name,))
        ),
        quote_plus(code.code),
        quote_plus(AUTH_TYPE_REGISTER),
    )

    api.send_messages(list(api.messages_for_recipients([
        (code.email, {
            'base_url': settings.SITE_BASE_URL,
            'confirmation_url': url,
        })
    ], VERIFICATION_TEMPLATE_NAME)))
