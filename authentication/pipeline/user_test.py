"""Tests of user pipeline actions"""
from django.contrib.sessions.middleware import SessionMiddleware
import pytest
from social_django.utils import load_strategy, load_backend

from open_discussions.factories import UserFactory
from authentication.pipeline import user as user_actions
from authentication.exceptions import (
    InvalidPasswordException,
    RequirePasswordException,
    RequireRegistrationException,
    RequirePasswordAndProfileException,
)
from authentication.utils import SocialAuthState


def validate_email_auth_request_not_email_backend(mocker):
    """Tests that validate_email_auth_request return if not using the email backend"""
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = 'notemail'
    assert user_actions.validate_email_auth_request(mock_strategy, mock_backend) == {}


@pytest.mark.parametrize('has_user,expected', [
    (True, {
        'flow': SocialAuthState.FLOW_LOGIN,
    }),
    (False, {}),
])
@pytest.mark.django_db
def test_validate_email_auth_request(rf, has_user, expected):
    """Test that validate_email_auth_request returns correctly given the input"""
    request = rf.post('/complete/email')
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    user = UserFactory.create() if has_user else None

    assert user_actions.validate_email_auth_request(
        strategy, backend, pipeline_index=0, user=user
    ) == expected


def test_get_username(mocker, user):
    """Tests that we get a username for a new user"""
    mock_strategy = mocker.Mock()
    mock_strategy.storage.user.get_username.return_value = user.username
    assert user_actions.get_username(mock_strategy, None, user) == {'username': user.username}
    mock_strategy.storage.user.get_username.assert_called_once_with(user)


def test_get_username_no_user(mocker):
    """Tests that we get a username for a new user"""
    mock_strategy = mocker.Mock()
    assert user_actions.get_username(mock_strategy, None, None)['username'] is not None
    mock_strategy.storage.user.get_username.assert_not_called()


def test_user_password_not_email_backend(mocker):
    """Tests that user_password return if not using the email backend"""
    mock_strategy = mocker.MagicMock()
    mock_user = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = 'notemail'
    assert user_actions.validate_password(
        mock_strategy, mock_backend, pipeline_index=0, user=mock_user, flow=SocialAuthState.FLOW_LOGIN
    ) == {}
    # make sure we didn't update or check the password
    mock_user.set_password.assert_not_called()
    mock_user.save.assert_not_called()
    mock_user.check_password.assert_not_called()


@pytest.mark.parametrize('user_password', ['abc123', 'def456'])
def test_user_password_login(rf, user, user_password):
    """Tests that user_password works for login case"""
    request_password = 'abc123'
    user.set_password(user_password)
    user.save()
    request = rf.post('/complete/email', {
        'password': request_password,
        'email': user.email,
    })
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    if request_password == user_password:
        assert user_actions.validate_password(
            strategy, backend, pipeline_index=0, user=user, flow=SocialAuthState.FLOW_LOGIN
            ) == {}
    else:
        with pytest.raises(InvalidPasswordException):
            user_actions.validate_password(
                strategy, backend, pipeline_index=0, user=user, flow=SocialAuthState.FLOW_LOGIN
            )


def test_user_password_not_login(rf, user):
    """
    Tests that user_password performs denies authentication
    for an existing user if password not provided regardless of auth_type
    """
    user.set_password('abc123')
    user.save()
    request = rf.post('/complete/email', {
        'email': user.email,
    })
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    with pytest.raises(RequirePasswordException):
        user_actions.validate_password(
            strategy, backend, pipeline_index=0, user=user, flow=SocialAuthState.FLOW_LOGIN
        )


def test_user_password_not_exists(rf):
    """Tests that user_password raises auth error for nonexistent user"""
    request = rf.post('/complete/email', {
        'password': 'abc123',
        'email': 'doesntexist@localhost',
    })
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    with pytest.raises(RequireRegistrationException):
        user_actions.validate_password(
            strategy, backend, pipeline_index=0, user=None, flow=SocialAuthState.FLOW_LOGIN
        )


@pytest.mark.parametrize('backend_name,flow', [
    ('notemail', None),
    ('notemail', SocialAuthState.FLOW_REGISTER),
    ('notemail', SocialAuthState.FLOW_LOGIN),
    ('email', None),
    ('email', SocialAuthState.FLOW_LOGIN),
])
def test_validate_require_password_and_profile_via_email_exit(mocker, backend_name, flow):
    """Tests that require_password_and_profile_via_email returns if not using the email backend"""
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = backend_name
    assert user_actions.require_password_and_profile_via_email(
        mock_strategy, mock_backend, pipeline_index=0, flow=flow
    ) == {}

    mock_strategy.request_data.assert_not_called()


@pytest.mark.django_db
def test_validate_require_password_and_profile_via_email(mocker):
    """Tests that require_password_and_profile_via_email processes the request"""
    user = UserFactory.create(profile__name='')
    mock_strategy = mocker.Mock()
    mock_strategy.request_data.return_value = {
        'name': 'Jane Doe',
        'password': 'password1'
    }
    mock_backend = mocker.Mock()
    mock_backend.name = 'email'
    response = user_actions.require_password_and_profile_via_email(
        mock_strategy, mock_backend, pipeline_index=0, user=user, flow=SocialAuthState.FLOW_REGISTER
    )
    assert response == {
        'user': user,
        'profile': user.profile
    }
    assert response['profile'].name == 'Jane Doe'


@pytest.mark.django_db
def test_validate_require_password_and_profile_via_email_no_data(mocker):
    """Tests that require_password_and_profile_via_email raises an error if no data for name and password provided"""
    user = UserFactory.create(profile__name='')
    mock_strategy = mocker.Mock()
    mock_strategy.request_data.return_value = {}
    mock_backend = mocker.Mock()
    mock_backend.name = 'email'
    with pytest.raises(RequirePasswordAndProfileException):
        user_actions.require_password_and_profile_via_email(
            mock_strategy, mock_backend, pipeline_index=0, user=user, flow=SocialAuthState.FLOW_REGISTER
        )


@pytest.mark.django_db
def test_validate_require_password_and_profile_via_email_password_set(mocker):
    """Tests that require_password_and_profile_via_email works if profile and password already set and no data"""
    user = UserFactory()
    user.set_password('abc123')
    user.save()
    mock_strategy = mocker.Mock()
    mock_strategy.request_data.return_value = {}
    mock_backend = mocker.Mock()
    mock_backend.name = 'email'
    assert user_actions.require_password_and_profile_via_email(
        mock_strategy, mock_backend, pipeline_index=0, user=user, flow=SocialAuthState.FLOW_REGISTER
    ) == {
        'user': user,
        'profile': user.profile
    }


@pytest.mark.django_db
@pytest.mark.parametrize('backend_name,is_new', [
    ('notsaml', False),
    ('notsaml', True),
    ('saml', False),
    ('saml', True),
])
def test_validate_require_profile_update_user_via_saml(mocker, backend_name, is_new):
    """Tests that require_profile_update_user_via_saml returns {} if not using the saml backend"""
    user = UserFactory(first_name='Jane', last_name='Doe', profile__name='')
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    # don't test this, so mock an empty return
    mocker.patch('profiles.api._get_gravatar_urls_properties', return_value={})
    mock_backend.name = backend_name
    response = user_actions.require_profile_update_user_via_saml(  # pylint:disable=redundant-keyword-arg
        mock_strategy, mock_backend, 0, user=user, is_new=is_new
    )
    if not is_new or backend_name != 'saml':
        expected = {}
    else:
        expected = {
            'user': user,
            'profile': user.profile
        }
    assert response == expected
    if 'user' in response:
        assert response['profile'].name == 'Jane Doe'
