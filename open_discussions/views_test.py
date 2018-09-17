"""
Test end to end django views.
"""
# pylint: disable=redefined-outer-name,too-many-arguments
import json
import xml.etree.ElementTree as etree
from urllib.parse import urlencode

import pytest
from django.urls import reverse
from rest_framework_jwt.settings import api_settings

from open_discussions import features

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures('authenticated_site'),
]
lazy = pytest.lazy_fixture


@pytest.mark.parametrize('test_user,test_jwt_token,expect_auth', [
    [lazy('logged_in_user'), None, True],
    [lazy('user'), lazy('jwt_token'), False],
    [None, None, False]
])
def test_webpack_url(
        settings,
        mocker,
        client,
        authenticated_site,
        test_user,
        test_jwt_token,
        expect_auth
):
    """Verify that webpack bundle src shows up in production"""
    get_bundle_mock = mocker.patch('open_discussions.templatetags.render_bundle._get_bundle')
    settings.GA_TRACKING_ID = 'fake'
    settings.EMBEDLY_KEY = 'fake'
    settings.FEATURES[features.ANONYMOUS_ACCESS] = 'access'
    settings.FEATURES[features.SAML_AUTH] = False
    settings.FEATURES[features.EMAIL_AUTH] = False
    settings.FEATURES[features.USE_NEW_BRANDING] = False
    settings.ENVIRONMENT = 'test'
    settings.VERSION = '1.2.3'

    if test_user or test_jwt_token:
        expected_user_values = {
            'user_email': test_user.email,
            'username': test_user.username,
            'user_full_name': test_user.profile.name,
        }
    else:
        expected_user_values = {
            'user_email': None,
            'username': None,
            'user_full_name': None,
        }

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
        **{
            'gaTrackingID': 'fake',
            'public_path': '/static/bundles/',
            'site_url': settings.SITE_BASE_URL,
            'max_comment_depth': 6,
            'profile_ui_enabled': False,
            'authenticated_site': {
                'title': authenticated_site.title,
                'login_url': authenticated_site.login_url,
                'session_url': authenticated_site.session_url,
                'base_url': authenticated_site.base_url,
                'tos_url': authenticated_site.tos_url,
            },
            'is_authenticated': expect_auth,
            'allow_anonymous': 'access',
            'allow_saml_auth': False,
            'allow_email_auth': False,
            'use_new_branding': False,
            'support_email': settings.EMAIL_SUPPORT,
            'embedlyKey': 'fake',
            'environment': settings.ENVIRONMENT,
            'sentry_dsn': None,
            'release_version': settings.VERSION,
            'recaptchaKey': settings.RECAPTCHA_SITE_KEY,
        },
        **expected_user_values
    }


def test_webpack_url_jwt_redirect(client, user):
    """Test that a redirect happens for MM JWT tokens if provider is present"""
    jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
    jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER

    payload = jwt_payload_handler(user)
    payload['provider'] = 'micromasters'
    jwt_token = jwt_encode_handler(payload)

    client.cookies[api_settings.JWT_AUTH_COOKIE] = jwt_token

    response = client.get(reverse('open_discussions-index'))
    assert response.status_code == 302
    assert response.url == '{}?{}'.format(
        reverse('social:complete', args=('micromasters',)),
        urlencode({
            'next': 'http://testserver/',
        })
    )


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
