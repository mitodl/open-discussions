"""Custom authentication for DRF"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework.authentication import BaseAuthentication

User = get_user_model()

HEADER_PREFIX = "Token "
HEADER_PREFIX_LENGTH = len(HEADER_PREFIX)

logger = logging.getLogger()


def get_encoded_and_signed_subscription_token(user):
    """
    Returns a signed and encoded token for subscription authentication_classes

    Args:
        user (User): user to generate the token for

    Returns:
        str: a signed token for subscription authentication_classes
    """
    signer = signing.TimestampSigner()
    return signer.sign(user.username)


def unsign_and_verify_username_from_token(token):
    """
    Returns the unsigned username from a subscription token

    Args:
        token (str): the encoded token

    Returns:
        str: the decoded username
    """

    signer = signing.TimestampSigner()
    try:
        return signer.unsign(
            token,
            max_age=settings.OPEN_DISCUSSIONS_UNSUBSCRIBE_TOKEN_MAX_AGE_SECONDS
        )
    except:  # pylint: disable=bare-except
        return None


class StatelessTokenAuthentication(BaseAuthentication):
    """
    Stateless authentication via a authorization token

    NOTE: this is a highly trusting version of authentication and should only be
          used for certain things such as email unsubscribes
    """
    def authenticate(self, request):
        """
        Attempts to authenticate using a stateless token
        """
        if 'HTTP_AUTHORIZATION' in request.META:
            header_value = request.META['HTTP_AUTHORIZATION']

            if not header_value.startswith(HEADER_PREFIX):
                return None

            token = header_value[HEADER_PREFIX_LENGTH:]

            username = unsign_and_verify_username_from_token(token)

            if not username:
                return None

            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return None

            return (user, None)

        return None
