"""Tests of user pipeline actions"""
import inspect

from django.contrib.sessions.middleware import SessionMiddleware
import pytest
from social_core.exceptions import AuthForbidden
from social_django.utils import load_strategy, load_backend
from rest_framework import status

from channels.models import RedditAccessToken, RedditRefreshToken
from notifications.models import NotificationSettings
from open_discussions.factories import UserFactory
from open_discussions.forms import AUTH_TYPE_LOGIN, AUTH_TYPE_REGISTER
from open_discussions.pipeline import user as user_actions


def _validate_email_auth_request_not_email_backend(mocker):
    """Tests that validate_email_auth_request return if not using the email backend"""
    mock_strategy = mocker.MagicMock()
    mock_backend = mocker.Mock()
    mock_backend.name = 'notemail'
    assert user_actions.validate_password(mock_strategy, mock_backend) is None


@pytest.mark.parametrize('auth_type,has_user,expected', [
    (AUTH_TYPE_LOGIN, True, {
        'is_login': True,
        'is_register': False,
    }),
    (AUTH_TYPE_LOGIN, False, {
        'is_login': True,
        'is_register': False,
    }),
    (AUTH_TYPE_REGISTER, True, {
        'is_login': True,
        'is_register': False,
    }),
    (AUTH_TYPE_REGISTER, False, {
        'is_login': False,
        'is_register': True,
    }),
    (None, True, {
        'is_login': True,
        'is_register': False,
    }),
    (None, False, AuthForbidden),
])
@pytest.mark.django_db
def test_validate_email_auth_request(rf, auth_type, has_user, expected):
    """Test that validate_email_auth_request returns correctly given the input"""
    request = rf.post('/complete/email', {
        'auth_type': auth_type,
    } if auth_type else {})
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    user = UserFactory.create() if has_user else None

    if inspect.isclass(expected) and issubclass(expected, Exception):
        with pytest.raises(expected):
            user_actions.validate_email_auth_request(strategy, backend, user=user)
    else:
        assert user_actions.validate_email_auth_request(strategy, backend, user=user) == expected


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
    assert user_actions.validate_password(mock_strategy, mock_backend, user=mock_user, is_login=True) is None
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
        'auth_type': AUTH_TYPE_LOGIN,
    })
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    if request_password == user_password:
        assert user_actions.validate_password(strategy, backend, user=user, is_login=True) is None
    else:
        with pytest.raises(AuthForbidden):
            user_actions.validate_password(strategy, backend, user=user, is_login=True)


def test_user_password_not_login(rf, user):
    """
    Tests that user_password performs denies authentication
    for an existing user if password not provided regardless of auth_type
    """
    user.set_password('abc123')
    user.save()
    request = rf.post('/complete/email', {
        'email': user.email,
        'auth_type': AUTH_TYPE_LOGIN,
    })
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    response = user_actions.validate_password(strategy, backend, user=user, is_login=True)
    assert response.status_code == status.HTTP_200_OK
    assert 'This field is required' in str(response.content)


def test_user_password_not_exists(rf):
    """Tests that user_password raises auth error for nonexistent user"""
    request = rf.post('/complete/email', {
        'password': 'abc123',
        'email': 'doesntexist@localhost',
        'auth_type': AUTH_TYPE_REGISTER,
    })
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    with pytest.raises(AuthForbidden):
        user_actions.validate_password(strategy, backend, user=None, is_login=True)


@pytest.mark.parametrize('backend_name,is_login', [
    ('notemail', False),
    ('notemail', True),
    ('email', False),
])
def test_validate_require_password_and_profile_not_email_backend(mocker, backend_name, is_login):
    """Tests that require_password_and_profile returns if not using the email backend"""
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = backend_name
    assert user_actions.require_password_and_profile(
        mock_strategy, mock_backend, 0, is_login=is_login
    ) == {}


@pytest.mark.django_db
@pytest.mark.betamax
def test_initialize_user():
    """Tests that a new users is initialized"""
    # don't use the user fixture because it creates Reddit*Token objects implicitly
    user = UserFactory.create()
    assert NotificationSettings.objects.filter(user=user).count() == 0
    assert RedditAccessToken.objects.filter(user=user).count() == 0
    assert RedditRefreshToken.objects.filter(user=user).count() == 0

    assert user_actions.initialize_user(user=user, is_new=True) is None

    assert RedditAccessToken.objects.filter(user=user).count() == 1
    assert RedditRefreshToken.objects.filter(user=user).count() == 1
    assert NotificationSettings.objects.filter(user=user).count() == 2
