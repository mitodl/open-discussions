"""Tests for authentication views"""
# pylint: disable=redefined-outer-name

from django.contrib.auth import get_user, get_user_model
from django.urls import reverse
import factory
import pytest
from rest_framework import status
from social_core.backends.email import EmailAuth
from social_core.backends.saml import SAMLAuth

from authentication.backends.micromasters import MicroMastersAuth
from authentication.serializers import PARTIAL_PIPELINE_TOKEN_KEY
from authentication.utils import SocialAuthState
from open_discussions import features
from open_discussions.factories import UserSocialAuthFactory
from open_discussions.test_utils import any_instance_of, MockResponse

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("indexing_user")]
lazy = pytest.lazy_fixture

NEW_EMAIL = "test@example.com"
NEXT_URL = "/next/url"

User = get_user_model()


@pytest.fixture
def email_user(user):
    """Fixture for a user that has an 'email' type UserSocialAuth"""
    UserSocialAuthFactory.create(user=user, provider=EmailAuth.name, uid=user.email)
    return user


@pytest.fixture
def mm_user(user):
    """Fixture for a user that has a 'micromasters' type UserSocialAuth"""
    UserSocialAuthFactory.create(
        user=user, provider=MicroMastersAuth.name, uid=user.email
    )
    return user


@pytest.fixture
def enrollment_job_mock(mocker):
    """Fixture for user enrollment celery task"""
    mocker.patch("authentication.api.update_enrollments_for_email.delay")


# pylint:disable=too-many-arguments
def assert_api_call(
    client,
    url,
    payload,
    expected,
    expect_authenticated=False,
    expect_status=status.HTTP_200_OK,
    use_defaults=True,
):
    """Run the API call and perform basic assertions"""
    assert bool(get_user(client).is_authenticated) is False

    response = client.post(reverse(url), payload)
    actual = response.json()

    defaults = {
        "errors": [],
        "redirect_url": None,
        "extra_data": {},
        "state": None,
        "provider": None,
        "flow": None,
        "partial_token": any_instance_of(str),
    }

    assert actual == ({**defaults, **expected} if use_defaults else expected)
    assert response.status_code == expect_status

    assert bool(get_user(client).is_authenticated) is expect_authenticated

    return actual


@pytest.fixture()
def mock_email_send(mocker):
    """Mock the email send API"""
    yield mocker.patch("mail.verification_api.send_verification_email")


@pytest.fixture()
def mock_recaptcha_success(mocker):
    """Mock Google recaptcha request"""
    yield mocker.patch(
        "authentication.views.requests.post",
        return_value=MockResponse(
            content='{"success": true}', status_code=status.HTTP_200_OK
        ),
    )


@pytest.fixture()
def mock_recaptcha_failure(mocker):
    """Mock Google recaptcha request"""
    yield mocker.patch(
        "authentication.views.requests.post",
        return_value=MockResponse(
            content='{"success": false, "error-codes": ["bad-request"]}',
            status_code=status.HTTP_200_OK,
        ),
    )


@pytest.fixture()
def login_email_exists(client, email_user):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        return assert_api_call(
            client,
            "psa-login-email",
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "email": email_user.email,
                "next": NEXT_URL,
            },
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": EmailAuth.name,
                "state": SocialAuthState.STATE_LOGIN_PASSWORD,
                "extra_data": {
                    "name": email_user.profile.name,
                    "profile_image_small": email_user.profile.image_small_file.url,
                },
            },
        )

    yield run_step


@pytest.fixture()
def login_email_next(client, email_user):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        return assert_api_call(
            client,
            "psa-login-email",
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "email": email_user.email,
                "next": NEXT_URL,
            },
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": EmailAuth.name,
                "state": SocialAuthState.STATE_LOGIN_PASSWORD,
                "extra_data": {
                    "name": email_user.profile.name,
                    "profile_image_small": email_user.profile.image_small_file.url,
                },
            },
        )

    yield run_step


@pytest.fixture()
def login_email_mm_only(client, mm_user):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        return assert_api_call(
            client,
            "psa-login-email",
            {"flow": SocialAuthState.FLOW_LOGIN, "email": mm_user.email},
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": MicroMastersAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_LOGIN_PROVIDER,
                "extra_data": {
                    "name": mm_user.profile.name,
                    "profile_image_small": mm_user.profile.image_small_file.url,
                },
            },
        )

    yield run_step


@pytest.fixture()
def login_email_saml_exists(client, user, settings):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        settings.FEATURES[features.SAML_AUTH] = True
        UserSocialAuthFactory.create_batch(
            3,
            user=user,
            provider=factory.Iterator(
                [SAMLAuth.name, MicroMastersAuth.name, EmailAuth.name]
            ),
            uid=user.username,
        )
        return assert_api_call(
            client,
            "psa-login-email",
            {"flow": SocialAuthState.FLOW_LOGIN, "email": user.email},
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": SAMLAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_LOGIN_PROVIDER,
                "extra_data": {
                    "name": user.profile.name,
                    "profile_image_small": user.profile.image_small_file.url,
                },
            },
        )

    yield run_step


@pytest.fixture()
def register_email_exists(client, user, mock_email_send):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        result = assert_api_call(
            client,
            "psa-register-email",
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "email": user.email,
                "next": NEXT_URL,
            },
            {
                "errors": ["Password is required to login"],
                "flow": SocialAuthState.FLOW_REGISTER,
                "provider": EmailAuth.name,
                "state": SocialAuthState.STATE_LOGIN_PASSWORD,
            },
        )
        mock_email_send.assert_not_called()
        return result

    yield run_step


@pytest.fixture()
def register_mm_exists(client, mm_user, mock_email_send):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        result = assert_api_call(
            client,
            "psa-register-email",
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "email": mm_user.email,
                "next": NEXT_URL,
            },
            {
                "errors": [],
                "flow": SocialAuthState.FLOW_REGISTER,
                "provider": MicroMastersAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_LOGIN_PROVIDER,
                "extra_data": {
                    "name": mm_user.profile.name,
                    "profile_image_small": mm_user.profile.image_small_file.url,
                },
            },
        )
        mock_email_send.assert_not_called()
        return result

    yield run_step


@pytest.fixture()
def login_email_not_exists(client):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        result = assert_api_call(
            client,
            "psa-login-email",
            {"flow": SocialAuthState.FLOW_LOGIN, "email": NEW_EMAIL},
            {
                "errors": ["Couldn't find your MIT OPEN Account"],
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": EmailAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_ERROR,
            },
        )
        assert User.objects.filter(email=NEW_EMAIL).exists() is False
        return result

    yield run_step


@pytest.fixture()
def register_email_not_exists(client, mock_email_send):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        result = assert_api_call(
            client,
            "psa-register-email",
            {"flow": SocialAuthState.FLOW_REGISTER, "email": NEW_EMAIL},
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "provider": EmailAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_REGISTER_CONFIRM_SENT,
            },
        )
        mock_email_send.assert_called_once()
        assert User.objects.filter(email=NEW_EMAIL).exists() is False
        return result

    yield run_step


@pytest.fixture()
def register_email_not_exists_with_recaptcha(
    settings, client, mock_email_send, mock_recaptcha_success
):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        settings.RECAPTCHA_SITE_KEY = "fake"
        result = assert_api_call(
            client,
            "psa-register-email",
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "email": NEW_EMAIL,
                "recaptcha": "fake",
            },
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "provider": EmailAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_REGISTER_CONFIRM_SENT,
            },
        )
        mock_recaptcha_success.assert_called_once()
        mock_email_send.assert_called_once()
        return result

    yield run_step


@pytest.fixture()
def register_email_not_exists_with_recaptcha_invalid(
    settings, client, mock_email_send, mock_recaptcha_failure
):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        settings.RECAPTCHA_SITE_KEY = "fake"
        result = assert_api_call(
            client,
            "psa-register-email",
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "email": NEW_EMAIL,
                "recaptcha": "fake",
            },
            {"error-codes": ["bad-request"], "success": False},
            expect_status=status.HTTP_400_BAD_REQUEST,
            use_defaults=False,
        )
        mock_recaptcha_failure.assert_called_once()
        mock_email_send.assert_not_called()
        return result

    yield run_step


@pytest.fixture()
def login_password_valid(client, user):
    """Yield a function for this step"""
    password = "password1"

    def run_step(last_result):
        """Run the step"""
        user.set_password(password)
        user.save()
        return assert_api_call(
            client,
            "psa-login-password",
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "partial_token": last_result["partial_token"],
                "password": password,
            },
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": EmailAuth.name,
                "redirect_url": NEXT_URL,
                "partial_token": None,
                "state": SocialAuthState.STATE_SUCCESS,
            },
            expect_authenticated=True,
        )

    yield run_step


@pytest.fixture()
def login_password_user_inactive(client, user):
    """Yield a function for this step"""
    password = "password1"

    def run_step(last_result):
        """Run the step"""
        user.is_active = False
        user.set_password(password)
        user.save()
        return assert_api_call(
            client,
            "psa-login-password",
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "partial_token": last_result["partial_token"],
                "password": password,
            },
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": EmailAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_INACTIVE,
            },
        )

    yield run_step


@pytest.fixture()
def login_password_invalid(client, user):
    """Yield a function for this step"""

    def run_step(last_result):
        """Run the step"""
        user.set_password("password1")
        user.save()
        return assert_api_call(
            client,
            "psa-login-password",
            {
                "flow": SocialAuthState.FLOW_LOGIN,
                "partial_token": last_result["partial_token"],
                "password": "invalidpass",
            },
            {
                "errors": ["Unable to login with that email and password combination"],
                "flow": SocialAuthState.FLOW_LOGIN,
                "provider": EmailAuth.name,
                "state": SocialAuthState.STATE_ERROR,
            },
        )

    yield run_step


@pytest.fixture()
def redeem_confirmation_code(client, mock_email_send):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        _, _, code, partial_token = mock_email_send.call_args[0]
        return assert_api_call(
            client,
            "psa-register-confirm",
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "verification_code": code.code,
                "partial_token": partial_token,
            },
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "provider": EmailAuth.name,
                "state": SocialAuthState.STATE_REGISTER_DETAILS,
            },
        )

    yield run_step


@pytest.fixture()
def redeem_confirmation_code_twice(client, mock_email_send):
    """Yield a function for this step"""

    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        _, _, code, partial_token = mock_email_send.call_args[0]
        return assert_api_call(
            client,
            "psa-register-confirm",
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "verification_code": code.code,
                "partial_token": partial_token,
            },
            {
                "errors": [],
                "flow": SocialAuthState.FLOW_REGISTER,
                "provider": EmailAuth.name,
                "redirect_url": None,
                "partial_token": None,
                "state": SocialAuthState.STATE_INVALID_EMAIL,
            },
        )

    yield run_step


@pytest.fixture()
def register_profile_details(client):
    """Yield a function for this step"""

    def run_step(last_result):
        """Run the step"""
        return assert_api_call(
            client,
            "psa-register-details",
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "partial_token": last_result["partial_token"],
                "password": "password1",
                "name": "Sally Smith",
            },
            {
                "flow": SocialAuthState.FLOW_REGISTER,
                "provider": EmailAuth.name,
                "partial_token": None,
                "state": SocialAuthState.STATE_SUCCESS,
            },
            expect_authenticated=True,
        )

    yield run_step


@pytest.mark.betamax
@pytest.mark.usefixture("mock_email_send")
@pytest.mark.parametrize(
    "steps",
    [
        ["login_email_exists", "login_password_valid"],
        ["login_email_exists", "login_password_invalid"],
        ["login_email_exists", "login_password_user_inactive"],
        ["login_email_not_exists"],
        ["register_email_exists", "login_password_valid"],
        ["register_email_exists", "login_password_invalid"],
        [
            "register_email_not_exists",
            "redeem_confirmation_code",
            "register_profile_details",
        ],
        [
            "register_email_not_exists_with_recaptcha",
            "redeem_confirmation_code",
            "register_profile_details",
        ],
        [
            "register_email_not_exists",
            "redeem_confirmation_code",
            "redeem_confirmation_code_twice",
        ],
        ["register_email_not_exists_with_recaptcha_invalid"],
        ["login_email_mm_only"],
        ["login_email_saml_exists"],
    ],
    ids=lambda arg: "->".join(arg) if isinstance(arg, list) else None,
)
def test_login_register_flows(request, steps, enrollment_job_mock):
    """Walk the steps and assert expected results"""
    last_result = None
    for fixture_name in steps:
        assert_step = request.getfixturevalue(fixture_name)
        last_result = assert_step(last_result)


def test_new_register_no_session_partial(client):
    """
    When a user registers for the first time and a verification email is sent, the partial
    token should be cleared from the session. The Partial object associated with that token should
    only be used when it's matched from the email verification link.
    """
    assert_api_call(
        client,
        "psa-register-email",
        {"flow": SocialAuthState.FLOW_REGISTER, "email": NEW_EMAIL},
        {
            "flow": SocialAuthState.FLOW_REGISTER,
            "provider": EmailAuth.name,
            "partial_token": None,
            "state": SocialAuthState.STATE_REGISTER_CONFIRM_SENT,
        },
    )
    assert PARTIAL_PIPELINE_TOKEN_KEY not in client.session.keys()


def test_login_email_error(client, mocker):
    """Tests email login with error result"""
    assert bool(get_user(client).is_authenticated) is False

    mocked_authenticate = mocker.patch(
        "authentication.serializers.SocialAuthSerializer._authenticate"
    )
    mocked_authenticate.return_value = "invalid"

    # start login with email
    response = client.post(
        reverse("psa-login-email"),
        {"flow": SocialAuthState.FLOW_LOGIN, "email": "anything@example.com"},
    )
    assert response.json() == {
        "errors": [],
        "flow": SocialAuthState.FLOW_LOGIN,
        "provider": EmailAuth.name,
        "redirect_url": None,
        "partial_token": None,
        "state": SocialAuthState.STATE_ERROR,
        "extra_data": {},
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is False


def test_login_email_hijacked(client, user, admin_user):
    """Test that a 403 response is returned for email login view if user is hijacked"""
    client.force_login(admin_user)
    client.post("/hijack/{}/".format(user.id))
    response = client.post(
        reverse("psa-login-email"),
        {"flow": SocialAuthState.FLOW_LOGIN, "email": "anything@example.com"},
    )
    assert response.status_code == 403


def test_register_email_hijacked(client, user, admin_user):
    """Test that a 403 response is returned for email register view if user is hijacked"""
    client.force_login(admin_user)
    client.post("/hijack/{}/".format(user.id))
    response = client.post(
        reverse("psa-register-email"),
        {"flow": SocialAuthState.FLOW_LOGIN, "email": "anything@example.com"},
    )
    assert response.status_code == 403


@pytest.mark.parametrize("test_jwt_token", [lazy("jwt_token"), None])
@pytest.mark.parametrize("hijacked", [True, False])
def test_login_complete(
    settings, client, logged_in_user, admin_user, test_jwt_token, hijacked
):  # pylint: disable=unused-argument
    """Verify that the jwt-complete view invalidates the JWT auth cookie"""
    if hijacked:
        client.force_login(admin_user)
        client.post("/hijack/{}/".format(logged_in_user.id))

    response = client.get(reverse("login-complete"))

    assert response.url == "/"
    if test_jwt_token and not hijacked:
        assert settings.OPEN_DISCUSSIONS_COOKIE_NAME in response.cookies
        cookie = response.cookies[settings.OPEN_DISCUSSIONS_COOKIE_NAME]
        assert cookie["max-age"] == 0
        assert cookie["domain"] == settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN
    else:
        assert settings.OPEN_DISCUSSIONS_COOKIE_NAME not in response.cookies


class TestDjoserViews:
    """Tests for views that modify Djoser views"""

    # pylint: disable=too-many-arguments
    @pytest.mark.parametrize(
        "url,patch_view_method",
        [
            ("password-reset-api", "reset_password"),
            ("password-reset-confirm-api", "reset_password_confirm"),
            ("set-password-api", "set_password"),
        ],
    )
    def test_password_reset_coerce_204(
        self, mocker, client, user, url, patch_view_method
    ):
        """
        Verify that password reset views coerce a 204 response to a 200 in order
        to play nice with redux-hammock.
        """
        mock_response = MockResponse(
            content=None, status_code=status.HTTP_204_NO_CONTENT
        )
        patched_base_method = mocker.patch(
            "authentication.views.UserViewSet.{}".format(patch_view_method),
            return_value=mock_response,
        )
        client.force_login(user)
        response = client.post(reverse(url), {})
        patched_base_method.assert_called_once()
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {}

    @pytest.mark.parametrize(
        "response_status,expected_session_update",
        [
            [status.HTTP_200_OK, True],
            [status.HTTP_204_NO_CONTENT, True],
            [status.HTTP_400_BAD_REQUEST, False],
        ],
    )
    def test_password_change_session_update(
        self, mocker, response_status, expected_session_update, client, user
    ):
        """
        Tests that the password change view updates the Django session when the
        request succeeds.
        """
        mock_response = MockResponse(content=None, status_code=response_status)
        mocker.patch(
            "authentication.views.UserViewSet.set_password", return_value=mock_response
        )
        update_session_patch = mocker.patch(
            "authentication.views.update_session_auth_hash", return_value=mocker.Mock()
        )
        client.force_login(user)
        client.post(reverse("set-password-api"), {})
        assert update_session_patch.called is expected_session_update


def test_get_social_auth_types(client, user):
    """Verify that get_social_auth_types returns a list of providers that the user has authenticated with"""
    social_auth_providers = ["provider1", "provider2"]
    url = reverse("get-auth-types-api")
    UserSocialAuthFactory.create_batch(
        2, user=user, provider=factory.Iterator(social_auth_providers)
    )
    client.force_login(user)
    resp = client.get(url)
    assert resp.json() == [{"provider": provider} for provider in social_auth_providers]
