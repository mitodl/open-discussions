"""Tests for authentication views"""
import pytest
from django.urls import reverse
from rest_framework_jwt.settings import api_settings

pytestmark = [
    pytest.mark.usefixtures('authenticated_site'),
]

COOKIE_KEY = 'cookie_monster'


@pytest.mark.parametrize('use_jwt', [True, False])
def test_login_login_complete(settings, client, user, jwt_token, use_jwt):
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
