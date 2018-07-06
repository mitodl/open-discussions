"""JWT-based authentication"""
from django.contrib.auth.models import User
import jwt
from rest_framework_jwt.settings import api_settings
from social_core.backends.legacy import LegacyAuth
from social_core.exceptions import AuthException


class BaseJwtAuth(LegacyAuth):
    """Base implementation for JWT-based authentication"""
    ID_KEY = 'username'
    EXTRA_DATA = ['username', 'email']

    def auth_complete(self, *args, **kwargs):
        """Perform the authentication"""
        jwt_decode_handler = api_settings.JWT_DECODE_HANDLER

        cookies = self.strategy.request.COOKIES

        if api_settings.JWT_AUTH_COOKIE not in cookies:
            raise AuthException(self, 'Authorization header not present')

        auth = cookies.get(api_settings.JWT_AUTH_COOKIE)

        try:
            payload = jwt_decode_handler(auth)
        except jwt.InvalidTokenError as exc:
            raise AuthException(self, 'Invalid JWT') from exc

        try:
            user = User.objects.get(username=payload['username'])
        except User.DoesNotExist as exc:
            raise AuthException(self, 'Invalid JWT username') from exc

        kwargs.update({
            'user': user,
            'response': payload,
            'backend': self,
        })
        return self.strategy.authenticate(*args, **kwargs)

    def get_user_details(self, response):
        """Get the user details"""
        return {
            'username': response['username'],
        }
