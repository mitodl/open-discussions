"""Tests for authentication views"""
# pylint: disable=redefined-outer-name
from django.contrib.auth import get_user, get_user_model
from django.urls import reverse
import pytest
from rest_framework import status
from rest_framework_jwt.settings import api_settings

from authentication.utils import SocialAuthState
from open_discussions import features
from open_discussions.test_utils import any_instance_of

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures('authenticated_site', 'email_auth_enabled'),
]

COOKIE_KEY = 'cookie_monster'
NEW_EMAIL = 'test@example.com'

User = get_user_model()


@pytest.fixture
def email_auth_enabled(settings):
    """Ensure email auth is enabled"""
    settings.FEATURES[features.EMAIL_AUTH] = True


@pytest.mark.parametrize('url', (
    'psa-login-email',
    'psa-login-password',
    'psa-register-email',
    'psa-register-confirm',
    'psa-register-details',
))
def test_auth_views_disabled(settings, client, user, url):
    """Tests all the auth views return a 404 if this feature is disabled"""
    settings.FEATURES[features.EMAIL_AUTH] = False
    response = client.post(reverse(url), {
        'email': user.email
    })
    assert response.status_code == status.HTTP_404_NOT_FOUND


def assert_api_call(client, url, payload, expected, expect_authenticated=False):
    """Run the API call and perform basic assertions"""
    assert bool(get_user(client).is_authenticated) is False

    response = client.post(reverse(url), payload)
    actual = response.json()

    assert actual == expected
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is expect_authenticated

    return actual


@pytest.fixture()
def mock_email_send(mocker):
    """Mock the email send API"""
    yield mocker.patch('mail.verification_api.send_verification_email')


@pytest.fixture()
def login_email_exists(client, user):
    """Yield a function for this step"""
    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        return assert_api_call(
            client,
            'psa-login-email',
            {
                'flow': SocialAuthState.FLOW_LOGIN,
                'email': user.email,
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': any_instance_of(str),
                'state': SocialAuthState.STATE_LOGIN_PASSWORD,
            }
        )
    yield run_step


@pytest.fixture()
def register_email_exists(client, user, mock_email_send):
    """Yield a function for this step"""
    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        result = assert_api_call(
            client,
            'psa-register-email',
            {
                'flow': SocialAuthState.FLOW_REGISTER,
                'email': user.email,
            },
            {
                'errors': ['Password is required to login'],
                'flow': SocialAuthState.FLOW_REGISTER,
                'partial_token': any_instance_of(str),
                'state': SocialAuthState.STATE_LOGIN_PASSWORD,
            }
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
            'psa-login-email',
            {
                'flow': SocialAuthState.FLOW_LOGIN,
                'email': NEW_EMAIL,
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': any_instance_of(str),
                'state': SocialAuthState.STATE_REGISTER_EMAIL,
            }
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
            'psa-register-email',
            {
                'flow': SocialAuthState.FLOW_REGISTER,
                'email': NEW_EMAIL,
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_REGISTER,
                'partial_token': None,
                'state': SocialAuthState.STATE_REGISTER_CONFIRM_SENT,
            }
        )
        mock_email_send.assert_called_once()
        assert User.objects.filter(email=NEW_EMAIL).exists() is False
        return result
    yield run_step


@pytest.fixture()
def login_password_valid(client, user):
    """Yield a function for this step"""
    password = 'password1'

    def run_step(last_result):
        """Run the step"""
        user.set_password(password)
        user.save()
        return assert_api_call(
            client,
            'psa-login-password',
            {
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': last_result['partial_token'],
                'password': password,
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': None,
                'state': SocialAuthState.STATE_SUCCESS,
            },
            expect_authenticated=True
        )
    yield run_step


@pytest.fixture()
def login_password_user_inactive(client, user):
    """Yield a function for this step"""
    password = 'password1'

    def run_step(last_result):
        """Run the step"""
        user.is_active = False
        user.set_password(password)
        user.save()
        return assert_api_call(
            client,
            'psa-login-password',
            {
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': last_result['partial_token'],
                'password': password,
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': None,
                'state': SocialAuthState.STATE_INACTIVE,
            }
        )
    yield run_step


@pytest.fixture()
def login_password_invalid(client, user):
    """Yield a function for this step"""
    def run_step(last_result):
        """Run the step"""
        user.set_password('password1')
        user.save()
        return assert_api_call(
            client,
            'psa-login-password',
            {
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': last_result['partial_token'],
                'password': 'invalidpass',
            },
            {
                'errors': ['Unable to login with that email and password combination'],
                'flow': SocialAuthState.FLOW_LOGIN,
                'partial_token': any_instance_of(str),
                'state': SocialAuthState.STATE_ERROR,
            }
        )
    yield run_step


@pytest.fixture()
def register_continue_from_login(client, mock_email_send):
    """Yield a function for this step"""
    def run_step(last_result):
        """Run the step"""
        result = assert_api_call(
            client,
            'psa-register-email',
            {
                'flow': SocialAuthState.FLOW_REGISTER,
                'partial_token': last_result['partial_token'],
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_REGISTER,
                'partial_token': None,
                'state': SocialAuthState.STATE_REGISTER_CONFIRM_SENT,
            }
        )
        mock_email_send.assert_called_once()
        assert User.objects.filter(email=NEW_EMAIL).exists() is False
        return result
    yield run_step


@pytest.fixture()
def redeem_confirmation_code(client, mock_email_send):
    """Yield a function for this step"""
    def run_step(last_result):  # pylint: disable=unused-argument
        """Run the step"""
        code = mock_email_send.call_args[0][2]
        return assert_api_call(
            client,
            'psa-register-confirm',
            {
                'flow': SocialAuthState.FLOW_REGISTER,
                'verification_code': code.code,
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_REGISTER,
                'partial_token': any_instance_of(str),
                'state': SocialAuthState.STATE_REGISTER_DETAILS,
            }
        )
    yield run_step


@pytest.fixture()
def register_profile_details(client):
    """Yield a function for this step"""
    def run_step(last_result):
        """Run the step"""
        return assert_api_call(
            client,
            'psa-register-details',
            {
                'flow': SocialAuthState.FLOW_REGISTER,
                'partial_token': last_result['partial_token'],
                'password': 'password1',
                'name': 'Sally Smith',
            },
            {
                'errors': [],
                'flow': SocialAuthState.FLOW_REGISTER,
                'partial_token': None,
                'state': SocialAuthState.STATE_SUCCESS,
            },
            expect_authenticated=True
        )
    yield run_step


@pytest.mark.betamax
@pytest.mark.usefixture('mock_email_send')
@pytest.mark.parametrize('steps', [
    [
        'login_email_exists',
        'login_password_valid',
    ],
    [
        'login_email_exists',
        'login_password_invalid',
    ],
    [
        'login_email_exists',
        'login_password_user_inactive',
    ],
    [
        'login_email_not_exists',
        'register_continue_from_login',
        'redeem_confirmation_code',
        'register_profile_details',
    ],
    [
        'register_email_exists',
        'login_password_valid',
    ],
    [
        'register_email_exists',
        'login_password_invalid',
    ],
    [
        'register_email_not_exists',
        'redeem_confirmation_code',
        'register_profile_details',
    ],
], ids=lambda arg: '->'.join(arg) if isinstance(arg, list) else None)
def test_login_register_flows(request, steps):
    """Walk the steps and assert expected results"""
    last_result = None
    for fixture_name in steps:
        assert_step = request.getfixturevalue(fixture_name)
        last_result = assert_step(last_result)


def test_login_email_error(settings, client, mocker):
    """Tests email login with error result"""
    settings.FEATURES[features.EMAIL_AUTH] = True

    assert bool(get_user(client).is_authenticated) is False

    mocked_authenticate = mocker.patch('authentication.serializers.SocialAuthSerializer._authenticate')
    mocked_authenticate.return_value = 'invalid'

    # start login with email
    response = client.post(reverse('psa-login-email'), {
        'flow': SocialAuthState.FLOW_LOGIN,
        'email': 'anything@example.com',
    })
    assert response.json() == {
        'errors': [],
        'flow': SocialAuthState.FLOW_LOGIN,
        'partial_token': None,
        'state': SocialAuthState.STATE_ERROR,
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is False


@pytest.mark.parametrize('use_jwt', [True, False])
def test_login_complete(settings, client, user, jwt_token, use_jwt):
    """Verify that the jwt-complete view invalidates the JWT auth cookie"""
    if use_jwt:
        client.cookies[api_settings.JWT_AUTH_COOKIE] = jwt_token
    client.force_login(user)

    response = client.get(reverse('login-complete'))

    assert response.url == '/'

    if use_jwt:
        assert COOKIE_KEY in response.cookies
        cookie = response.cookies[COOKIE_KEY]
        assert cookie['max-age'] == 0
        assert cookie['domain'] == settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN
    else:
        assert COOKIE_KEY not in response.cookies
