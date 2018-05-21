"""Tests for authentication views"""
import pytest
from django.urls import reverse
from rest_framework_jwt.settings import api_settings

from open_discussions.features import EMAIL_AUTH

pytestmark = [
    pytest.mark.usefixtures('authenticated_site'),
]


def test_login_jwt_complete(settings, client, user, jwt_token):
    """Verify that the jwt-complete view invalidates the JWT auth cookie"""
    client.cookies[api_settings.JWT_AUTH_COOKIE] = jwt_token
    client.force_login(user)

    response = client.get(reverse('jwt-complete'))

    cookie = response.cookies['cookie_monster']
    assert cookie['max-age'] == 0
    assert cookie['domain'] == settings.OPEN_DISCUSSIONS_COOKIE_DOMAIN


@pytest.mark.parametrize('is_enabled', [True, False])
@pytest.mark.parametrize('is_anonymous', [True, False])
def test_login_render(settings, client, user, is_enabled, is_anonymous):
    """Test that login page renders or returns a 404"""
    settings.FEATURES[EMAIL_AUTH] = is_enabled

    if not is_anonymous:
        client.force_login(user)

    response = client.get(reverse('login'), follow=True)

    if is_enabled:
        assert response.status_code == 200
        if not is_anonymous:
            assert response.redirect_chain == [
                ('/', 302),
            ]
    else:
        assert response.status_code == 404


@pytest.mark.parametrize('is_enabled', [True, False])
@pytest.mark.parametrize('is_anonymous', [True, False])
def test_register_render(settings, client, user, is_enabled, is_anonymous):
    """Test that register page renders or returns a 404"""
    settings.FEATURES[EMAIL_AUTH] = is_enabled

    if not is_anonymous:
        client.force_login(user)

    response = client.get(reverse('register'), follow=True)

    if is_enabled:
        assert response.status_code == 200
        if not is_anonymous:
            assert response.redirect_chain == [
                ('/', 302),
            ]
    else:
        assert response.status_code == 404
