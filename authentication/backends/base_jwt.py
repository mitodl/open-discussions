"""JWT-based authentication"""
import jwt
from rest_framework_jwt.settings import api_settings
from social_core.backends.legacy import LegacyAuth
from social_core.exceptions import AuthException


class BaseJwtAuth(LegacyAuth):
    """Base implementation for JWT-based authentication"""

    ID_KEY = "username"
    EXTRA_DATA = ["username", "email"]
    ISSUER_NAME = None

    def user_data(self):
        """Returns user data from the JWT"""
        jwt_decode_handler = api_settings.JWT_DECODE_HANDLER

        cookies = self.strategy.request.COOKIES

        if api_settings.JWT_AUTH_COOKIE not in cookies:
            raise AuthException(self, "Authorization header not present")

        auth = cookies.get(api_settings.JWT_AUTH_COOKIE)

        try:
            # this should have the remote username in the ID_KEY field
            return jwt_decode_handler(auth)
        except jwt.InvalidTokenError as exc:
            raise AuthException(self, "Invalid JWT") from exc

    def auth_complete(self, *args, **kwargs):
        """Perform the authentication"""
        data = self.user_data()

        kwargs.update({"response": data, "backend": self})

        return self.strategy.authenticate(*args, **kwargs)
