"""Tests for verification_api"""
from django.core.mail import EmailMessage
from django.contrib.sessions.middleware import SessionMiddleware
from django.shortcuts import reverse
import pytest
from social_core.backends.email import EmailAuth
from social_django.utils import load_backend, load_strategy

from mail import verification_api
from open_discussions.test_utils import any_instance_of

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("authenticated_site")]


def test_send_verification_email(mocker, rf):
    """Test that send_verification_email sends an email with the link in it"""
    send_messages_mock = mocker.patch("mail.api.send_messages")
    email = "test@localhost"
    request = rf.post(reverse("social:complete", args=("email",)), {"email": email})
    # social_django depends on request.sesssion, so use the middleware to set that
    SessionMiddleware().process_request(request)
    strategy = load_strategy(request)
    backend = load_backend(strategy, EmailAuth.name, None)
    code = mocker.Mock(code="abc")
    verification_api.send_verification_email(strategy, backend, code, "def")

    send_messages_mock.assert_called_once_with([any_instance_of(EmailMessage)])

    email_body = send_messages_mock.call_args[0][0][0].body
    assert "/signup/confirm/?verification_code=abc&partial_token=def" in email_body
