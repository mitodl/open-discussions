"""Authentication exceptions"""
from social_core.exceptions import AuthException


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


class RequirePasswordException(PartialException):
    """Authentication requires a password"""
    def __str__(self):
        return "Password is required to login"


class RequirePasswordAndProfileException(PartialException):
    """Authentication requires a password and profile"""
