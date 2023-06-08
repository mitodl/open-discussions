"""Custom authentication for DRF"""
import logging

from django.contrib.auth import get_user_model
import jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework_jwt.authentication import JSONWebTokenAuthentication


User = get_user_model()

HEADER_PREFIX = "Token "
HEADER_PREFIX_LENGTH = len(HEADER_PREFIX)

logger = logging.getLogger()


class IgnoreExpiredJwtAuthentication(JSONWebTokenAuthentication):
    """Version of JSONWebTokenAuthentication that ignores JWT values if they're expired"""

    def get_token_from_request(self, request):
        """Returns the JWT values as long as it's not expired"""
        value = super().get_token_from_request(request)

        try:
            # try to decode the value just to see if it's expired
            from rest_framework_jwt.settings import api_settings

            jwt_decode_handler = api_settings.JWT_DECODE_HANDLER
            jwt_decode_handler(value)
        except jwt.ExpiredSignatureError:
            # if it is expired, treat it as if the user never passed a token
            logger.debug("Ignoring expired JWT")
            return None
        except:  # pylint: disable=bare-except
            # we're only interested in jwt.ExpiredSignature above
            # exception handling in general is already handled in the base class
            pass

        return value


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
        from open_discussions.auth_utils import unsign_and_verify_username_from_token

        if "HTTP_AUTHORIZATION" in request.META:
            header_value = request.META["HTTP_AUTHORIZATION"]

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
