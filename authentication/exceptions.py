"""Authentication exceptions"""
from social_core.exceptions import AuthException


class RequireProviderException(AuthException):
    """The user is required to authenticate via a specific provider/backend"""

    def __init__(self, backend, social_auth):
        """
        Args:
            social_auth (social_django.models.UserSocialAuth): A social auth objects
        """
        self.social_auth = social_auth
        super().__init__(backend)


class PartialException(AuthException):
    """Partial pipeline exception"""

    def __init__(self, backend, partial):
        self.partial = partial
        super().__init__(backend)


class InvalidPasswordException(PartialException):
    """Provided password was invalid"""

    def __str__(self):
        return "Unable to login with that email and password combination"


class RequireEmailException(PartialException):
    """Authentication requires an email"""

    def __str__(self):
        return "Email is required to login"


class RequireRegistrationException(PartialException):
    """Authentication requires registration"""

    def __str__(self):
        return "There is no account with that email"


class RequirePasswordException(PartialException):
    """Authentication requires a password"""

    def __str__(self):
        return "Password is required to login"


class RequirePasswordAndProfileException(PartialException):
    """Authentication requires a password and profile"""

    def __str__(self):
        return "Password and profile need to be filled out"


class UserMissingSocialAuthException(Exception):
    """Raised if the user doesn't have a social auth"""
