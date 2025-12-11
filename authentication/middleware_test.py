"""Tests for auth middleware"""
from urllib.parse import quote

import pytest
from django.contrib.sessions.middleware import SessionMiddleware
from django.shortcuts import reverse
from rest_framework import status
from social_core.exceptions import AuthAlreadyAssociated
from social_django.utils import load_backend, load_strategy

from authentication.middleware import (
    BlockedIPMiddleware,
    SocialAuthExceptionRedirectMiddleware,
)
from authentication.models import BlockedIPRange
from open_discussions.factories import UserFactory


def test_process_exception_no_strategy(mocker, rf, settings):
    """Tests that if the request has no strategy it does nothing"""
    settings.DEBUG = False
    request = rf.get(reverse("social:complete", args=("email",)))
    middleware = SocialAuthExceptionRedirectMiddleware(mocker.Mock())
    assert middleware.process_exception(request, None) is None


def test_process_exception(mocker, rf, settings):
    """Tests that a process_exception handles auth exceptions correctly"""
    settings.DEBUG = False
    msg = "error message"
    request = rf.get(reverse("social:complete", args=("email",)))
    # social_django depends on request.sesssion, so use the middleware to set that
    SessionMiddleware(mocker.Mock()).process_request(request)
    strategy = load_strategy(request)
    backend = load_backend(strategy, "email", None)
    exc = AuthAlreadyAssociated(backend, msg)
    request.social_strategy = strategy
    request.backend = backend

    middleware = SocialAuthExceptionRedirectMiddleware(mocker.Mock())
    result = middleware.process_exception(request, exc)
    assert result.status_code == status.HTTP_302_FOUND
    assert result.url == "{}?message={}&backend={}".format(
        reverse("login"), quote(str(exc)), backend.name
    )


def test_process_exception_non_auth_error(mocker, rf, settings):
    """Tests that a process_exception handles non-auth exceptions correctly"""
    settings.DEBUG = False
    request = rf.get(reverse("social:complete", args=("email",)))
    # social_django depends on request.sesssion, so use the middleware to set that
    SessionMiddleware(mocker.Mock()).process_request(request)
    strategy = load_strategy(request)
    backend = load_backend(strategy, "email", None)
    request.social_strategy = strategy
    request.backend = backend

    middleware = SocialAuthExceptionRedirectMiddleware(mocker.Mock())
    assert (
        middleware.process_exception(request, Exception("something bad happened"))
        is None
    )


@pytest.mark.django_db
@pytest.mark.parametrize("is_blocked", [True, False])
@pytest.mark.parametrize("is_super", [True, False])
@pytest.mark.parametrize("exempt_view", [True, False])
@pytest.mark.parametrize("is_routable", [True, False])
def test_process_view_blocked_ip_middleware(  # pylint:disable=too-many-arguments
    mocker, rf, is_blocked, is_super, exempt_view, is_routable
):
    """Check that `process_view` raises a PermissionDenied error when appropriate"""
    user = UserFactory.create(is_superuser=is_super)
    view = "search" if exempt_view else "courses-list"
    request = rf.post(reverse(view))
    request.user = user

    callback = mocker.Mock(blocked_ip_exempt=exempt_view)
    BlockedIPRange.objects.create(ip_start="193.12.12.10", ip_end="193.12.12.12")
    user_ip = "193.12.12.11" if is_blocked else "193.12.12.13"
    mocker.patch(
        "authentication.middleware.get_client_ip", return_value=(user_ip, is_routable)
    )

    middleware = BlockedIPMiddleware(mocker.Mock())
    if is_blocked and is_routable and not exempt_view and not is_super:
        assert middleware.process_view(request, callback, None, {}).status_code == 403
    else:
        assert middleware.process_view(request, callback, None, {}) is None
