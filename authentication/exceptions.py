"""Authentication exceptions"""
from social_core.exceptions import AuthException


class PartialException(AuthException):
    """Partial pipeline exception"""
    def __init__(self, backend, partial):
        self.partial = partial
        super().__init__(backend)


class InvalidPasswordException(PartialException):
    """Provided password was invalid"""


class RequireEmailException(PartialException):
    """Authentication requires an email"""


class RequirePasswordException(PartialException):
    """Authentication requires a password"""


class RequirePasswordAndProfileException(PartialException):
    """Authentication requires a password and profile"""
