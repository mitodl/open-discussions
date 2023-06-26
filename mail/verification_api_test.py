"""Tests for verification_api"""
from django.core.mail import EmailMessage
from django.contrib.sessions.middleware import SessionMiddleware
from django.shortcuts import reverse
import pytest
from social_core.backends.email import EmailAuth
from social_django.utils import load_backend, load_strategy

from mail import verification_api
from authentication.models import BlockedEmailRegex
from open_discussions.test_utils import any_instance_of

pytestmark = [pytest.mark.django_db]


@pytest.mark.parametrize(
    "email,match,blocked",
    [
        ["spammer@spam.com", "@spam.com", True],
        ["spammer@antispam.com", "@spam.com", False],
        ["spammer@spam.com", "spam.com", True],
        ["spammer@antispam.com", "spam.com", True],
        ["spammer@spam.com", "spammer@spam.com", True],
        ["antispammer@spam.com", "spammer@spam.com", True],
        ["spammerbot@spam.com", "spammer@spam.com", False],
        ["antispammer@spam.com", "^spammer@spam.com", False],
        ["spammer@spam.com", "^spammer@spam.com", True],
        ["spammer@spam.com", "@spam.com", True],
        ["spammer@spam.com.edu", "@spam.com", True],
        ["spammer@spam.com.edu", "@spam.com$", False],
    ],
)
def test_send_verification_email(mocker, rf, email, match, blocked):
    """Test that send_verification_email sends an email with the link in it, if the address is not blocked"""
    BlockedEmailRegex.objects.create(match=match)
    send_messages_mock = mocker.patch("mail.api.send_messages")
    request = rf.post(reverse("social:complete", args=("email",)), {"email": email})
    # social_django depends on request.sesssion, so use the middleware to set that
    SessionMiddleware(mocker.Mock()).process_request(request)
    strategy = load_strategy(request)
    backend = load_backend(strategy, EmailAuth.name, None)
    code = mocker.Mock(code="abc", email=email)
    verification_api.send_verification_email(strategy, backend, code, "def")

    if not blocked:
        send_messages_mock.assert_called_once_with([any_instance_of(EmailMessage)])
        email_body = send_messages_mock.call_args[0][0][0].body
        assert "/signup/confirm/?verification_code=abc&partial_token=def" in email_body
    else:
        send_messages_mock.assert_not_called()
