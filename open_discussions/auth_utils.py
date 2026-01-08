"""Authentication utils"""
from django.conf import settings
from django.core import signing


def get_encoded_and_signed_subscription_token(user):
    """Returns a signed and encoded token for subscription authentication_classes

    Args:
        user (User): user to generate the token for

    Returns:
        str: a signed token for subscription authentication_classes

    """
    signer = signing.TimestampSigner()
    return signer.sign(user.username)


def unsign_and_verify_username_from_token(token):
    """Returns the unsigned username from a subscription token

    Args:
        token (str): the encoded token

    Returns:
        str: the decoded username

    """
    signer = signing.TimestampSigner()
    try:
        return signer.unsign(
            token, max_age=settings.OPEN_DISCUSSIONS_UNSUBSCRIBE_TOKEN_MAX_AGE_SECONDS
        )
    except signing.BadSignature:
        return None
