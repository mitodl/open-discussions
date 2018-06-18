"""Tests of user pipeline actions"""
from django.contrib.sessions.middleware import SessionMiddleware
import pytest
from social_django.utils import load_strategy, load_backend

from channels.models import RedditAccessToken, RedditRefreshToken
from notifications.models import NotificationSettings
from open_discussions.factories import UserFactory
from authentication.pipeline import user as user_actions
from authentication.pipeline.user import update_full_name
from authentication.exceptions import (
    InvalidPasswordException,
    RequirePasswordException,
)


def _validate_email_auth_request_not_email_backend(mocker):
    """Tests that validate_email_auth_request return if not using the email backend"""
    mock_strategy = mocker.MagicMock()
    mock_backend = mocker.Mock()
    mock_backend.name = 'notemail'
    assert user_actions.validate_password(mock_strategy, mock_backend) == {}


@pytest.mark.parametrize('is_login,has_user,expected', [
    (True, True, {
        'is_login': True,
        'is_register': False,
    }),
    (True, False, {
        'is_login': True,
        'is_register': False,
    }),
    (False, True, {
        'is_login': True,
        'is_register': False,
    }),
    (False, False, {
        'is_login': False,
        'is_register': True,
    }),
    (None, True, {
        'is_login': True,
        'is_register': False,
    }),
    (None, False, {
        'is_login': False,
        'is_register': True,
    }),
])
@pytest.mark.django_db
def test_validate_email_auth_request(rf, is_login, has_user, expected):
    """Test that validate_email_auth_request returns correctly given the input"""
    request = rf.post('/complete/email', )
    middleware = SessionMiddleware()
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, 'email', None)

    kwargs = {
        'is_login': is_login,
    } if is_login is not None else {}

    user = UserFactory.create() if has_user else None

    assert user_actions.validate_email_auth_request(
        strategy, backend, pipeline_index=0, user=user, **kwargs
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
        mock_strategy, mock_backend, pipeline_index=0, user=mock_user, is_login=True
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
        assert user_actions.validate_password(strategy, backend, pipeline_index=0, user=user, is_login=True) == {}
    else:
        with pytest.raises(InvalidPasswordException):
            user_actions.validate_password(strategy, backend, pipeline_index=0, user=user, is_login=True)


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
        user_actions.validate_password(strategy, backend, pipeline_index=0, user=user, is_login=True)


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

    with pytest.raises(InvalidPasswordException):
        user_actions.validate_password(strategy, backend, pipeline_index=0, user=None, is_login=True)


@pytest.mark.parametrize('backend_name,is_login', [
    ('notemail', False),
    ('notemail', True),
    ('email', False),
])
def test_validate_require_password_and_profile_not_email_backend(mocker, backend_name, is_login):
    """Tests that require_password_and_profile_via_email returns {} if not using the email backend"""
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = backend_name
    assert user_actions.require_password_and_profile_via_email(
        mock_strategy, mock_backend, pipeline_index=0, is_login=is_login
    ) == {}


@pytest.mark.django_db
@pytest.mark.parametrize('backend_name,is_new', [
    ('notsaml', False),
    ('notsaml', True),
    ('saml', False),
    ('saml', True),
])
def test_validate_require_profile_update_user_via_saml(mocker, backend_name, is_new):
    """Tests that require_profile_update_user_via_saml returns {} if not using the saml backend"""
    user = UserFactory(first_name='Jane', last_name='Doe', profile=None)
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
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
    if 'user' in expected:
        assert expected['profile'].name == 'Jane Doe'


@pytest.mark.django_db
@pytest.mark.parametrize('first_name, last_name', [
    ['Keihanaikukauakahihuliheekahaunaele', 'van der Graaf'],
    ['Jane', ''],
    ['Joe', 'FakeName10' * 16]
])
def test_update_full_name(first_name, last_name):
    """ Tests that user names are updated correctly """
    user = UserFactory.create()
    update_full_name(user, ' '.join([first_name, last_name]))
    assert user.first_name == first_name[:30]
    assert user.last_name == last_name[:30]


@pytest.mark.django_db
@pytest.mark.betamax
def test_initialize_user():
    """Tests that a new users is initialized"""
    # don't use the user fixture because it creates Reddit*Token objects implicitly
    user = UserFactory.create()
    assert NotificationSettings.objects.filter(user=user).count() == 0
    assert RedditAccessToken.objects.filter(user=user).count() == 0
    assert RedditRefreshToken.objects.filter(user=user).count() == 0

    assert user_actions.initialize_user(user=user, is_new=True) == {}

    assert RedditAccessToken.objects.filter(user=user).count() == 1
    assert RedditRefreshToken.objects.filter(user=user).count() == 1
    assert NotificationSettings.objects.filter(user=user).count() == 2
