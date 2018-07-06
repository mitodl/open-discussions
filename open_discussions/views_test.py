"""
Test end to end django views.
"""
import json
import xml.etree.ElementTree as etree

import pytest
from django.urls import reverse
from rest_framework_jwt.settings import api_settings

from open_discussions import features

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures('authenticated_site'),
]


def test_webpack_url(settings, client, user, mocker, authenticated_site):
    """Verify that webpack bundle src shows up in production"""
    settings.GA_TRACKING_ID = 'fake'
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')
    settings.FEATURES[features.ANONYMOUS_ACCESS] = 'access'
    settings.FEATURES[features.EMAIL_AUTH] = False

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
        'profile_ui_enabled': False,
        'user_full_name': user.profile.name,
        'authenticated_site': {
            'title': authenticated_site.title,
            'login_url': authenticated_site.login_url,
            'session_url': authenticated_site.session_url,
            'base_url': authenticated_site.base_url,
            'tos_url': authenticated_site.tos_url,
        },
        'is_authenticated': True,
        'allow_anonymous': 'access',
        'allow_email_auth': False,
        'support_email': settings.EMAIL_SUPPORT,
    }


def test_webpack_url_jwt(
        settings, client, user, jwt_token, mocker, authenticated_site
):  # pylint: disable=too-many-arguments
    """Verify that webpack bundle src shows up in production for jwt auth"""
    settings.GA_TRACKING_ID = 'fake'
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')
    settings.FEATURES[features.ANONYMOUS_ACCESS] = 'access'
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
        'profile_ui_enabled': False,
        'user_full_name': user.profile.name,
        'authenticated_site': {
            'title': authenticated_site.title,
            'login_url': authenticated_site.login_url,
            'session_url': authenticated_site.session_url,
            'base_url': authenticated_site.base_url,
            'tos_url': authenticated_site.tos_url,
        },
        'is_authenticated': False,
        'allow_anonymous': 'access',
        'allow_email_auth': False,
        'support_email': settings.EMAIL_SUPPORT,
    }


def test_webpack_url_anonymous(settings, client, mocker, authenticated_site):
    """Verify that webpack bundle src shows up in production"""
    settings.GA_TRACKING_ID = 'fake'
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')
    settings.FEATURES[features.ANONYMOUS_ACCESS] = 'access'
    settings.FEATURES[features.EMAIL_AUTH] = False

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
        'profile_ui_enabled': False,
        'user_full_name': None,
        'authenticated_site': {
            'title': authenticated_site.title,
            'login_url': authenticated_site.login_url,
            'session_url': authenticated_site.session_url,
            'base_url': authenticated_site.base_url,
            'tos_url': authenticated_site.tos_url,
        },
        'is_authenticated': False,
        'allow_anonymous': 'access',
        'allow_email_auth': False,
        'support_email': settings.EMAIL_SUPPORT,
    }


@pytest.mark.parametrize('is_enabled', [True, False])
def test_saml_metadata(settings, client, user, is_enabled):
    """Test that SAML metadata page renders or returns a 404"""
    settings.FEATURES[features.SAML_AUTH] = is_enabled
    if is_enabled:
        settings.SOCIAL_AUTH_SAML_SP_ENTITY_ID = "http://mit.edu"
        settings.SOCIAL_AUTH_SAML_SP_PUBLIC_CERT = ""
        settings.SOCIAL_AUTH_SAML_SP_PRIVATE_KEY = ""
        settings.SOCIAL_AUTH_SAML_ORG_INFO = {"en-US": {"name": "MIT", "displayname": "MIT", "url": "http://mit.edu"}}
        settings.SOCIAL_AUTH_SAML_TECHNICAL_CONTACT = {"givenName": "TestName", "emailAddress": "test@example.com"}
        settings.SOCIAL_AUTH_SAML_SUPPORT_CONTACT = {"givenName": "TestName", "emailAddress": "test@example.com"}
        settings.SOCIAL_AUTH_SAML_SP_EXTRA = {"assertionConsumerService": {"url": "http://mit.edu"}}

    client.force_login(user)
    response = client.get(reverse("saml-metadata"))

    if is_enabled:
        root = etree.fromstring(response.content)
        assert root.tag == '{urn:oasis:names:tc:SAML:2.0:metadata}EntityDescriptor'
        assert response.status_code == 200
    else:
        assert response.status_code == 404


@pytest.mark.parametrize('url, redirect', [
    ['/channel/test_channel/', '/c/test_channel/'],
    ['/channel/channel/n', '/c/channel/n'],
    ['/channel/channel/n/comment/20/', '/c/channel/n/comment/20/'],
])
def test_channel_redirect(client, url, redirect):
    """ Test that old channel URL's are redirected to new ones"""
    response = client.get(url, follow=True)
    last_url, _ = response.redirect_chain[-1]
    assert last_url == redirect
