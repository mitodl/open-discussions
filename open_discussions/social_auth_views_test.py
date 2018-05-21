"""Tests for the entire pipeline"""
# pylint: disable=redefined-outer-name
from django.contrib.auth.models import User
from django.shortcuts import reverse
from django.test import Client
from django.test.client import MULTIPART_CONTENT
import pytest
from rest_framework import status

from authentication.constants import AUTH_TYPE_REGISTER

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    """Revert client fixture to it's original"""
    return Client(content_type=MULTIPART_CONTENT)


# should replace this with some actual selenium tests at some point
def test_register_new_user(client, mocker, settings):
    """Should redirect to the completion url and send a confirmation email"""
    email_mock = mocker.patch('mail.verification_api.send_verification_email')
    api_mock = mocker.patch('channels.api.get_or_create_auth_tokens')
    email = 'fake@localhost'
    response = client.post(reverse('social:complete', args=('email',)), {
        'email': email,
        'auth_type': AUTH_TYPE_REGISTER,
    }, follow_redirects=True)

    assert response.status_code == status.HTTP_302_FOUND
    assert response.url == reverse(settings.SOCIAL_AUTH_EMAIL_VALIDATION_URL)
    email_mock.assert_called_once()

    code = email_mock.call_args[0][2]

    email_mock.reset_mock()

    response = client.get('{}?verification_code={}&auth_type={}'.format(
        reverse('social:complete', args=('email',)),
        code.code,
        AUTH_TYPE_REGISTER,
    ), follow_redirects=True)

    assert response.status_code == status.HTTP_200_OK
    email_mock.assert_not_called()  # shouldn't have called this again

    assert User.objects.filter(email=email).exists() is True

    response = client.post(
        reverse('social:complete', args=('email',)),
        {
            'fullname': 'Test name',
            'password': '12345',
            'password_confirm': '12345',
            'auth_type': AUTH_TYPE_REGISTER,
        }, follow_redirects=True)

    assert response.status_code == status.HTTP_302_FOUND
    assert response.url == '/'
    email_mock.assert_not_called()  # shouldn't have called this again
    api_mock.assert_called_once_with(User.objects.get(email=email))

    profile = User.objects.get(email=email).profile
    assert profile.name == 'Test name'
