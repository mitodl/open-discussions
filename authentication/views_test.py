"""Tests for authentication views"""
from django.contrib.auth import get_user
from django.urls import reverse
import pytest
from rest_framework import status
from rest_framework_jwt.settings import api_settings

from authentication.utils import SocialAuthState
from open_discussions import features
from open_discussions.factories import UserFactory
from open_discussions.test_utils import any_instance_of

pytestmark = [
    pytest.mark.usefixtures('authenticated_site'),
]

COOKIE_KEY = 'cookie_monster'


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


@pytest.mark.parametrize('user_password,input_password,expected_state,is_active,is_authenticated,expected', (
    # not logged in, password matches, should succeed
    ('password1', 'password1', SocialAuthState.STATE_SUCCESS, True, False, True),
    # logged in, password matches, should succeed
    ('password1', 'password1', SocialAuthState.STATE_SUCCESS, True, True, True),
    # not logged in, password matches, user inactive, should fail
    ('password1', 'password1', SocialAuthState.STATE_INACTIVE, False, False, False),
    # not logged in, password doesn't match, user active, should fail
    ('password1', 'password2', SocialAuthState.STATE_ERROR, True, False, False),
))
def test_login_email_and_password(
        settings, client, user, user_password, input_password, expected_state, is_active, is_authenticated, expected
):  # pylint: disable=too-many-arguments
    """Tests email/password login flow"""
    settings.FEATURES[features.EMAIL_AUTH] = True
    user.set_password(user_password)
    user.is_active = is_active
    user.save()

    if is_authenticated:
        client.force_login(user)

    assert bool(get_user(client).is_authenticated) is is_authenticated

    # start login with email
    response = client.post(reverse('psa-login-email'), {
        'flow': SocialAuthState.FLOW_LOGIN,
        'email': user.email,
    })
    assert response.json() == {
        'errors': [],
        'flow': SocialAuthState.FLOW_LOGIN,
        'partial_token': any_instance_of(str),
        'state': SocialAuthState.STATE_LOGIN_PASSWORD,
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is is_authenticated

    # feed the partial token into the next step with password
    response = client.post(reverse('psa-login-password'), {
        'flow': SocialAuthState.FLOW_LOGIN,
        'partial_token': response.json()['partial_token'],
        'password': input_password,
    })
    assert response.json() == {
        'errors': [] if (expected or not is_active) else [
            'Unable to login with that email and password combination'
        ],
        'flow': SocialAuthState.FLOW_LOGIN,
        'partial_token': None if (expected or not is_active) else any_instance_of(str),
        'state': expected_state,
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is expected


def test_login_email_not_exists(settings, client):
    """Tests email login for a nonexistent email"""
    settings.FEATURES[features.EMAIL_AUTH] = True

    assert bool(get_user(client).is_authenticated) is False

    # start login with email
    response = client.post(reverse('psa-login-email'), {
        'flow': SocialAuthState.FLOW_LOGIN,
        'email': 'missing@example.com',
    })
    assert response.json() == {
        'errors': [],
        'flow': SocialAuthState.FLOW_LOGIN,
        'partial_token': any_instance_of(str),
        'state': SocialAuthState.STATE_REGISTER_EMAIL,
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is False


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


@pytest.mark.betamax
@pytest.mark.parametrize('user_exists,expected_step_1_status', (
    # user registers a new account
    (False, SocialAuthState.STATE_REGISTER_CONFIRM_SENT,),
    # user tries to register with an email that already exists
    (True, SocialAuthState.STATE_LOGIN_PASSWORD,),
))
def test_register_email(
        settings, client, mocker, user_exists, expected_step_1_status
):  # pylint: disable=too-many-arguments
    """Tests the registration flow"""
    settings.FEATURES[features.EMAIL_AUTH] = True
    email = 'test@localhost'
    user = UserFactory.create(email=email) if user_exists else None

    mock_email_send = mocker.patch('mail.verification_api.send_verification_email')

    assert bool(get_user(client).is_authenticated) is False

    # start register with email
    response = client.post(reverse('psa-register-email'), {
        'flow': SocialAuthState.FLOW_REGISTER,
        'email': email,
    })
    assert response.json() == {
        'errors': ['Password is required to login'] if user else [],
        'flow': SocialAuthState.FLOW_REGISTER,
        'partial_token': any_instance_of(str) if user_exists else None,
        'state': expected_step_1_status,
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is False

    if user:
        mock_email_send.assert_not_called()
        # exit the test now, because further steps are covered by test_login_email_and_password above
        return
    else:
        mock_email_send.assert_called_once()

    # third arg to send_verification_email
    code = mock_email_send.call_args[0][2]

    # redeem the verification code from the email
    response = client.post(reverse('psa-register-confirm'), {
        'flow': SocialAuthState.FLOW_REGISTER,
        'verification_code': code.code,
    })
    assert response.json() == {
        'errors': ["Password and profile need to be filled out"],
        'flow': SocialAuthState.FLOW_REGISTER,
        'partial_token': any_instance_of(str),
        'state': SocialAuthState.STATE_REGISTER_DETAILS,
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is False

    # complete user details
    response = client.post(reverse('psa-register-details'), {
        'flow': SocialAuthState.FLOW_REGISTER,
        'partial_token': response.json()['partial_token'],
        'name': 'name',
        'password': 'password1'
    })
    assert response.json() == {
        'errors': [],
        'flow': SocialAuthState.FLOW_REGISTER,
        'partial_token': None,
        'state': SocialAuthState.STATE_SUCCESS,
    }
    assert response.status_code == status.HTTP_200_OK

    assert bool(get_user(client).is_authenticated) is True


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
