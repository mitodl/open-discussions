"""
Test end to end django views.
"""
import json

import pytest
from django.urls import reverse
from rest_framework_jwt.settings import api_settings

from open_discussions.features import ANONYMOUS_ACCESS, EMAIL_AUTH

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures('authenticated_site'),
]


def test_webpack_url(settings, client, user, mocker, authenticated_site):
    """Verify that webpack bundle src shows up in production"""
    settings.GA_TRACKING_ID = 'fake'
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')
    settings.FEATURES[ANONYMOUS_ACCESS] = 'access'

    client.force_login(user)
    response = client.get(reverse('open_discussions-index'))

    bundles = [bundle[0][1] for bundle in get_bundle_mock.call_args_list]
    assert set(bundles) == {
        'common',
        'root',
        'style',
        'zendesk',
    }
    js_settings = json.loads(response.context['js_settings_json'])
    assert js_settings == {
        'gaTrackingID': 'fake',
        'public_path': '/static/bundles/',
        'max_comment_depth': 6,
        'user_email': user.email,
        'username': user.username,
        'profile_image_small': user.profile.image_small,
        'user_full_name': user.profile.name,
        'authenticated_site': {
            'title': authenticated_site.title,
            'login_url': authenticated_site.login_url,
            'session_url': authenticated_site.session_url,
            'base_url': authenticated_site.base_url,
            'tos_url': authenticated_site.tos_url,
        },
        'allow_anonymous': 'access',
    }


def test_webpack_url_jwt(
        settings, client, user, jwt_token, mocker, authenticated_site
):  # pylint: disable=too-many-arguments
    """Verify that webpack bundle src shows up in production for jwt auth"""
    settings.GA_TRACKING_ID = 'fake'
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')
    settings.FEATURES[ANONYMOUS_ACCESS] = 'access'
    client.cookies[api_settings.JWT_AUTH_COOKIE] = jwt_token

    response = client.get(reverse('open_discussions-index'))

    bundles = [bundle[0][1] for bundle in get_bundle_mock.call_args_list]
    assert set(bundles) == {
        'common',
        'root',
        'style',
        'zendesk',
    }
    js_settings = json.loads(response.context['js_settings_json'])
    assert js_settings == {
        'gaTrackingID': 'fake',
        'public_path': '/static/bundles/',
        'max_comment_depth': 6,
        'user_email': user.email,
        'username': user.username,
        'profile_image_small': user.profile.image_small,
        'user_full_name': user.profile.name,
        'authenticated_site': {
            'title': authenticated_site.title,
            'login_url': authenticated_site.login_url,
            'session_url': authenticated_site.session_url,
            'base_url': authenticated_site.base_url,
            'tos_url': authenticated_site.tos_url,
        },
        'allow_anonymous': 'access',
    }


def test_webpack_url_anonymous(settings, client, mocker, authenticated_site):
    """Verify that webpack bundle src shows up in production"""
    settings.GA_TRACKING_ID = 'fake'
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')
    settings.FEATURES[ANONYMOUS_ACCESS] = 'access'

    response = client.get(reverse('open_discussions-index'))

    bundles = [bundle[0][1] for bundle in get_bundle_mock.call_args_list]
    assert set(bundles) == {
        'common',
        'root',
        'style',
        'zendesk',
    }
    js_settings = json.loads(response.context['js_settings_json'])
    assert js_settings == {
        'gaTrackingID': 'fake',
        'public_path': '/static/bundles/',
        'max_comment_depth': 6,
        'user_email': None,
        'username': None,
        'profile_image_small': None,
        'user_full_name': None,
        'authenticated_site': {
            'title': authenticated_site.title,
            'login_url': authenticated_site.login_url,
            'session_url': authenticated_site.session_url,
            'base_url': authenticated_site.base_url,
            'tos_url': authenticated_site.tos_url,
        },
        'allow_anonymous': 'access',
    }


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
