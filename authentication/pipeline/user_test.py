"""Tests of user pipeline actions"""
from unittest.mock import Mock

import pytest
from django.contrib.sessions.middleware import SessionMiddleware
from social_django.utils import load_backend, load_strategy

from authentication.exceptions import (
    InvalidPasswordException,
    RequirePasswordAndProfileException,
    RequirePasswordException,
    RequireProviderException,
    RequireRegistrationException,
)
from authentication.pipeline import user as user_actions
from authentication.utils import SocialAuthState
from open_discussions import features
from open_discussions.factories import UserFactory


def validate_email_auth_request_not_email_backend(mocker):
    """Tests that validate_email_auth_request return if not using the email backend"""
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = "notemail"
    assert user_actions.validate_email_auth_request(mock_strategy, mock_backend) == {}


@pytest.mark.parametrize(
    "has_user,expected", [(True, {"flow": SocialAuthState.FLOW_LOGIN}), (False, {})]
)
@pytest.mark.django_db
def test_validate_email_auth_request(mocker, rf, has_user, expected):
    """Test that validate_email_auth_request returns correctly given the input"""
    request = rf.post("/complete/email")
    middleware = SessionMiddleware(mocker.Mock())
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, "email", None)

    user = UserFactory.create() if has_user else None

    assert (
        user_actions.validate_email_auth_request(
            strategy, backend, pipeline_index=0, user=user
        )
        == expected
    )


def test_get_username(mocker, user):
    """Tests that we get a username for a new user"""
    mock_strategy = mocker.Mock()
    mock_strategy.storage.user.get_username.return_value = user.username
    assert user_actions.get_username(mock_strategy, None, user) == {
        "username": user.username
    }
    mock_strategy.storage.user.get_username.assert_called_once_with(user)


def test_get_username_no_user(mocker):
    """Tests that we get a username for a new user"""
    mock_strategy = mocker.Mock()
    assert user_actions.get_username(mock_strategy, None, None)["username"] is not None
    mock_strategy.storage.user.get_username.assert_not_called()


def test_user_password_not_email_backend(mocker):
    """Tests that user_password return if not using the email backend"""
    mock_strategy = mocker.MagicMock()
    mock_user = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = "notemail"
    assert (
        user_actions.validate_password(
            mock_strategy,
            mock_backend,
            pipeline_index=0,
            user=mock_user,
            flow=SocialAuthState.FLOW_LOGIN,
        )
        == {}
    )
    # make sure we didn't update or check the password
    mock_user.set_password.assert_not_called()
    mock_user.save.assert_not_called()
    mock_user.check_password.assert_not_called()


@pytest.mark.parametrize("user_password", ["abc123", "def456"])
def test_user_password_login(mocker, rf, user, user_password):
    """Tests that user_password works for login case"""
    request_password = "abc123"
    user.set_password(user_password)
    user.save()
    request = rf.post(
        "/complete/email", {"password": request_password, "email": user.email}
    )
    middleware = SessionMiddleware(mocker.Mock())
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, "email", None)

    if request_password == user_password:
        assert (
            user_actions.validate_password(
                strategy,
                backend,
                pipeline_index=0,
                user=user,
                flow=SocialAuthState.FLOW_LOGIN,
            )
            == {}
        )
    else:
        with pytest.raises(InvalidPasswordException):
            user_actions.validate_password(
                strategy,
                backend,
                pipeline_index=0,
                user=user,
                flow=SocialAuthState.FLOW_LOGIN,
            )


def test_user_password_not_login(mocker, rf, user):
    """Tests that user_password performs denies authentication
    for an existing user if password not provided regardless of auth_type
    """
    user.set_password("abc123")
    user.save()
    request = rf.post("/complete/email", {"email": user.email})
    middleware = SessionMiddleware(mocker.Mock())
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, "email", None)

    with pytest.raises(RequirePasswordException):
        user_actions.validate_password(
            strategy,
            backend,
            pipeline_index=0,
            user=user,
            flow=SocialAuthState.FLOW_LOGIN,
        )


def test_user_password_not_exists(mocker, rf):
    """Tests that user_password raises auth error for nonexistent user"""
    request = rf.post(
        "/complete/email", {"password": "abc123", "email": "doesntexist@localhost"}
    )
    middleware = SessionMiddleware(mocker.Mock())
    middleware.process_request(request)
    request.session.save()
    strategy = load_strategy(request)
    backend = load_backend(strategy, "email", None)

    with pytest.raises(RequireRegistrationException):
        user_actions.validate_password(
            strategy,
            backend,
            pipeline_index=0,
            user=None,
            flow=SocialAuthState.FLOW_LOGIN,
        )


@pytest.mark.parametrize(
    "backend_name,flow",
    [
        ("notemail", None),
        ("notemail", SocialAuthState.FLOW_REGISTER),
        ("notemail", SocialAuthState.FLOW_LOGIN),
        ("email", None),
        ("email", SocialAuthState.FLOW_LOGIN),
    ],
)
def test_validate_require_password_and_profile_via_email_exit(
    mocker, backend_name, flow
):
    """Tests that require_password_and_profile_via_email returns if not using the email backend"""
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = backend_name
    assert (
        user_actions.require_password_and_profile_via_email(
            mock_strategy, mock_backend, pipeline_index=0, flow=flow
        )
        == {}
    )

    mock_strategy.request_data.assert_not_called()


@pytest.mark.django_db
def test_validate_require_password_and_profile_via_email(mocker):
    """Tests that require_password_and_profile_via_email processes the request"""
    mock_profile_api = mocker.patch("authentication.pipeline.user.profile_api")
    user = UserFactory.create(profile__name="")
    mock_strategy = mocker.Mock()
    mock_strategy.request_data.return_value = {
        "name": "Jane Doe",
        "password": "password1",
    }
    mock_backend = mocker.Mock()
    mock_backend.name = "email"
    response = user_actions.require_password_and_profile_via_email(
        mock_strategy,
        mock_backend,
        pipeline_index=0,
        user=user,
        flow=SocialAuthState.FLOW_REGISTER,
    )
    assert response == {
        "user": user,
        "profile": mock_profile_api.ensure_profile.return_value,
    }
    mock_profile_api.ensure_profile.assert_called_once_with(user, {"name": "Jane Doe"})


@pytest.mark.django_db
def test_validate_require_password_and_profile_via_email_no_data(mocker):
    """Tests that require_password_and_profile_via_email raises an error if no data for name and password provided"""
    user = UserFactory.create(profile__name="")
    mock_strategy = mocker.Mock()
    mock_strategy.request_data.return_value = {}
    mock_backend = mocker.Mock()
    mock_backend.name = "email"
    with pytest.raises(RequirePasswordAndProfileException):
        user_actions.require_password_and_profile_via_email(
            mock_strategy,
            mock_backend,
            pipeline_index=0,
            user=user,
            flow=SocialAuthState.FLOW_REGISTER,
        )


@pytest.mark.django_db
def test_validate_require_password_and_profile_via_email_password_set(mocker):
    """Tests that require_password_and_profile_via_email works if profile and password already set and no data"""
    user = UserFactory()
    user.set_password("abc123")
    user.save()
    mock_strategy = mocker.Mock()
    mock_strategy.request_data.return_value = {}
    mock_backend = mocker.Mock()
    mock_backend.name = "email"
    assert user_actions.require_password_and_profile_via_email(
        mock_strategy,
        mock_backend,
        pipeline_index=0,
        user=user,
        flow=SocialAuthState.FLOW_REGISTER,
    ) == {"user": user, "profile": user.profile}


@pytest.mark.django_db
@pytest.mark.parametrize(
    "backend_name,is_new",
    [("notsaml", False), ("notsaml", True), ("saml", False), ("saml", True)],
)
def test_validate_require_profile_update_user_via_saml(mocker, backend_name, is_new):
    """Tests that require_profile_update_user_via_saml returns {} if not using the saml backend"""
    mock_profile_api = mocker.patch("authentication.pipeline.user.profile_api")
    user = UserFactory(first_name="Jane", last_name="Doe", profile__name="")
    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock()
    mock_backend.name = backend_name
    response = user_actions.require_profile_update_user_via_saml(  # pylint:disable=redundant-keyword-arg
        mock_strategy, mock_backend, 0, user=user, is_new=is_new
    )
    if not is_new or backend_name != "saml":
        expected = {}
    else:
        expected = {
            "user": user,
            "profile": mock_profile_api.ensure_profile.return_value,
        }
        mock_profile_api.ensure_profile.assert_called_once_with(
            user, {"name": user.get_full_name()}
        )
    assert response == expected


@pytest.mark.django_db
@pytest.mark.parametrize(
    "backend_name,flow,has_user,auth_types,raises",
    [
        ["email", SocialAuthState.FLOW_LOGIN, True, ["micromasters"], True],
        ["email", SocialAuthState.FLOW_LOGIN, True, ["saml"], False],
        ["email", SocialAuthState.FLOW_LOGIN, True, ["micromasters", "saml"], False],
        ["email", SocialAuthState.FLOW_REGISTER, False, [], False],
        ["email", SocialAuthState.FLOW_REGISTER, True, [], False],
        ["email", None, True, [], False],
        ["email", None, False, [], False],
        ["saml", None, True, [], False],
        ["saml", None, False, [], False],
        ["no", None, True, [], False],
        ["no", None, False, [], False],
    ],
)
def test_require_micromasters_provider(
    mocker, user, backend_name, flow, has_user, auth_types, raises
):  # pylint: disable=too-many-arguments
    """Tests that verify require_micromasters_provider behaves correctly

    It should only raise RequireProviderException if the user is logging in via email and only has MM auth setup
    """
    mock_strategy = mocker.Mock()
    mock_strategy.storage.user.get_social_auth_for_user.return_value = [
        mocker.Mock(provider=auth_type) for auth_type in auth_types
    ]

    mock_backend = mocker.Mock()
    mock_backend.name = backend_name

    args = [mock_strategy, mock_backend]
    kwargs = {"user": user if has_user else None, "flow": flow}

    if raises:
        with pytest.raises(RequireProviderException):
            user_actions.require_micromasters_provider(*args, **kwargs)
    else:
        assert user_actions.require_micromasters_provider(*args, **kwargs) == {}


@pytest.mark.django_db
@pytest.mark.parametrize(
    "backend_name,flow,social_auth,feature_flag_val,raises",
    [
        ["email", SocialAuthState.FLOW_LOGIN, Mock(provider="saml"), True, True],
        ["email", SocialAuthState.FLOW_LOGIN, Mock(provider="saml"), False, False],
        ["email", SocialAuthState.FLOW_LOGIN, None, True, False],
        ["email", SocialAuthState.FLOW_REGISTER, Mock(provider="saml"), True, False],
        ["not_email", SocialAuthState.FLOW_LOGIN, Mock(provider="saml"), True, False],
    ],
)
def test_require_touchstone_login(
    mocker, settings, backend_name, flow, social_auth, feature_flag_val, raises
):  # pylint: disable=too-many-arguments
    """Tests that verify test_require_touchstone_login raises a RequireProviderException
    if (a) the user is logging in via email, (b) has a SAML-type authentication, and
    (c) the SAML auth feature flag in on
    """
    settings.FEATURES[features.SAML_AUTH] = feature_flag_val
    mock_strategy = mocker.Mock()
    mock_strategy.storage.user.get_social_auth.return_value = social_auth

    mock_backend = mocker.Mock()
    mock_backend.name = backend_name

    args = [mock_strategy, mock_backend]
    kwargs = {"flow": flow}

    if raises:
        with pytest.raises(RequireProviderException):
            user_actions.require_touchstone_login(*args, **kwargs)
    else:
        assert user_actions.require_touchstone_login(*args, **kwargs) == {}


@pytest.mark.parametrize("hijacked", [True, False])
def test_forbid_hijack(mocker, hijacked):
    """Tests that forbid_hijack action raises an exception if a user is hijacked"""
    mock_strategy = mocker.Mock()
    mock_strategy.session_get.return_value = hijacked

    mock_backend = mocker.Mock(name="email")

    args = [mock_strategy, mock_backend]
    kwargs = {"flow": SocialAuthState.FLOW_LOGIN}

    if hijacked:
        with pytest.raises(ValueError):
            user_actions.forbid_hijack(*args, **kwargs)
    else:
        assert user_actions.forbid_hijack(*args, **kwargs) == {}


@pytest.mark.parametrize("moira_enabled", [True, False])
@pytest.mark.parametrize("has_user", [True, False])
@pytest.mark.parametrize("is_active", [True, False])
def test_update_moira_lists(
    mocker, settings, has_user, user, is_active, moira_enabled
):  # pylint: disable=too-many-arguments
    """Test that update_moira_lists calls the moira api if the user is authenticated"""
    settings.FEATURES[features.MOIRA] = moira_enabled
    user.is_active = is_active
    user.save()

    mock_strategy = mocker.Mock()
    mock_backend = mocker.Mock(name="email")

    mock_update_user_moira_lists = mocker.patch(
        "authentication.pipeline.user.update_user_moira_lists.delay"
    )

    args = [mock_strategy, mock_backend]
    kwargs = {"user": user if has_user else None}

    assert user_actions.update_moira_lists(*args, **kwargs) == {}

    if moira_enabled and has_user and is_active:
        mock_update_user_moira_lists.assert_called_once_with(
            user.id, update_memberships=True
        )
    else:
        mock_update_user_moira_lists.assert_not_called()
