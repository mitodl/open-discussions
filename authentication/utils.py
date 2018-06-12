"""Authentication utils"""
from social_core.utils import get_strategy
from social_django.utils import STORAGE


class SocialAuthState:
    """Social auth state"""
    # login states
    STATE_LOGIN_EMAIL = "login/email"
    STATE_LOGIN_PASSWORD = "login/password"
    STATE_LOGIN_EDX = "login/edx"

    # registration states
    STATE_REGISTER_EMAIL = "register/email"
    STATE_REGISTER_CONFIRM_SENT = "register/confirm-sent"
    STATE_REGISTER_CONFIRM = "register/confirm"
    STATE_REGISTER_DETAILS = "register/details"

    # end states
    STATE_SUCCESS = "success"
    STATE_ERROR = "error"
    STATE_INACTIVE = "inactive"
    STATE_INVALID_EMAIL = "invalid-email"

    def __init__(self, state, partial=None, errors=None):
        self.state = state
        self.partial = partial
        self.errors = errors or []


def load_drf_strategy(request=None):
    """Returns the DRF strategy"""
    return get_strategy('authentication.strategy.DjangoRestFrameworkStrategy', STORAGE, request)
