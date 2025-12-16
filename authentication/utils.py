"""Authentication utils"""
from social_core.utils import get_strategy
from social_django.models import UserSocialAuth
from social_django.utils import STORAGE

from authentication.backends.micromasters import MicroMastersAuth
from authentication.exceptions import UserMissingSocialAuthException

# static for now
ALLOWED_PROVIDERS = [MicroMastersAuth.name]


class SocialAuthState:
    """Social auth state"""

    FLOW_REGISTER = "register"
    FLOW_LOGIN = "login"

    # login states
    STATE_LOGIN_EMAIL = "login/email"
    STATE_LOGIN_PASSWORD = "login/password"
    STATE_LOGIN_PROVIDER = "login/provider"

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

    def __init__(
        self,
        state,
        *,
        provider=None,
        partial=None,
        flow=None,
        errors=None,
        redirect_url=None,
        profile=None,
    ):  # pylint: disable=too-many-arguments
        self.state = state
        self.partial = partial
        self.flow = flow
        self.provider = provider
        self.errors = errors or []
        self.redirect_url = redirect_url
        self.profile = profile

    def get_partial_token(self):
        """Return the partial token or None"""
        return self.partial.token if self.partial else None


def load_drf_strategy(request=None):
    """Returns the DRF strategy"""
    return get_strategy(
        "authentication.strategy.DjangoRestFrameworkStrategy", STORAGE, request
    )


def jwt_get_username_from_payload_handler(payload):
    """Get the username from the payload

    To do this in concert with PSA, we lookup the username of the user that corresponds to the matching provider

    Args:
        payload(dict): JWT payload deserialized

    Returns:
        str: the username associated with this JWT

    """
    username = payload.get("username")

    # if an provider is provided and valid, treat the username as a social auth username
    # otherwise the username is used verbatim for backwards compatibility
    provider = payload.get("provider")
    if provider and provider in ALLOWED_PROVIDERS:
        # get the User.username for this social auth
        # if this errors, (not exactly one UserSocialAuth/User) we want to know
        try:
            username = UserSocialAuth.objects.values_list(
                "user__username", flat=True
            ).get(provider=provider, uid=username)
        except UserSocialAuth.DoesNotExist as exc:
            raise UserMissingSocialAuthException(
                "Found no UserSocialAuth for username"
            ) from exc

    return username
