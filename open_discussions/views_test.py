"""
Test end to end django views.
"""
# pylint: disable=redefined-outer-name,too-many-arguments
import json
import xml.etree.ElementTree as etree

import pytest
from django.urls import reverse

from open_discussions import features
from profiles.models import SOCIAL_SITE_NAME_MAP

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("authenticated_site")]
lazy = pytest.lazy_fixture


@pytest.mark.parametrize(
    "test_user,expect_auth", [[lazy("logged_in_user"), True], [None, False]]
)
def test_webpack_url(
    settings, mocker, client, authenticated_site, test_user, expect_auth
):
    """Verify that webpack bundle src shows up in production"""
    get_bundle_mock = mocker.patch(
        "open_discussions.templatetags.render_bundle._get_bundle"
    )
    settings.GA_TRACKING_ID = "fake"
    settings.EMBEDLY_KEY = "fake"
    settings.FEATURES[features.ANONYMOUS_ACCESS] = "access"
    settings.FEATURES[features.SAML_AUTH] = False
    settings.FEATURES[features.EMAIL_AUTH] = False
    settings.FEATURES[features.USE_NEW_BRANDING] = False
    settings.ENVIRONMENT = "test"
    settings.VERSION = "1.2.3"
    settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE = 123

    if test_user:
        expected_user_values = {
            "user_email": test_user.email,
            "username": test_user.username,
            "user_full_name": test_user.profile.name,
            "is_admin": test_user.is_superuser,
        }
    else:
        expected_user_values = {
            "user_email": None,
            "username": None,
            "user_full_name": None,
            "is_admin": False,
        }

    response = client.get(reverse("open_discussions-index"))
    bundles = [bundle[0][1] for bundle in get_bundle_mock.call_args_list]
    assert set(bundles) == {"common", "root", "style"}
    js_settings = json.loads(response.context["js_settings_json"])
    assert js_settings == {
        "gaTrackingID": "fake",
        "public_path": "/static/bundles/",
        "site_url": settings.SITE_BASE_URL,
        "max_comment_depth": 6,
        "profile_ui_enabled": False,
        "authenticated_site": {
            "title": authenticated_site.title,
            "login_url": authenticated_site.login_url,
            "session_url": authenticated_site.session_url,
            "base_url": authenticated_site.base_url,
            "tos_url": authenticated_site.tos_url,
        },
        "is_authenticated": expect_auth,
        "allow_anonymous": "access",
        "allow_saml_auth": False,
        "allow_email_auth": False,
        "allow_search": False,
        "use_new_branding": False,
        "support_email": settings.EMAIL_SUPPORT,
        "embedlyKey": "fake",
        "environment": settings.ENVIRONMENT,
        "sentry_dsn": None,
        "release_version": settings.VERSION,
        "recaptchaKey": settings.RECAPTCHA_SITE_KEY,
        "search_page_size": settings.ELASTICSEARCH_DEFAULT_PAGE_SIZE,
        "accepted_social_sites": list(SOCIAL_SITE_NAME_MAP.values()),
        **expected_user_values,
    }


@pytest.mark.parametrize("is_enabled", [True, False])
def test_saml_metadata(settings, client, user, is_enabled):
    """Test that SAML metadata page renders or returns a 404"""
    settings.FEATURES[features.SAML_AUTH] = is_enabled
    if is_enabled:
        settings.SOCIAL_AUTH_SAML_SP_ENTITY_ID = "http://mit.edu"
        settings.SOCIAL_AUTH_SAML_SP_PUBLIC_CERT = ""
        settings.SOCIAL_AUTH_SAML_SP_PRIVATE_KEY = ""
        settings.SOCIAL_AUTH_SAML_ORG_INFO = {
            "en-US": {"name": "MIT", "displayname": "MIT", "url": "http://mit.edu"}
        }
        settings.SOCIAL_AUTH_SAML_TECHNICAL_CONTACT = {
            "givenName": "TestName",
            "emailAddress": "test@example.com",
        }
        settings.SOCIAL_AUTH_SAML_SUPPORT_CONTACT = {
            "givenName": "TestName",
            "emailAddress": "test@example.com",
        }
        settings.SOCIAL_AUTH_SAML_SP_EXTRA = {
            "assertionConsumerService": {"url": "http://mit.edu"}
        }

    client.force_login(user)
    response = client.get(reverse("saml-metadata"))

    if is_enabled:
        root = etree.fromstring(response.content)
        assert root.tag == "{urn:oasis:names:tc:SAML:2.0:metadata}EntityDescriptor"
        assert response.status_code == 200
    else:
        assert response.status_code == 404


@pytest.mark.parametrize(
    "url, redirect",
    [
        ["/channel/test_channel/", "/c/test_channel/"],
        ["/channel/channel/n", "/c/channel/n"],
        ["/channel/channel/n/comment/20/", "/c/channel/n/comment/20/"],
    ],
)
def test_channel_redirect(client, url, redirect):
    """ Test that old channel URL's are redirected to new ones"""
    response = client.get(url, follow=True)
    last_url, _ = response.redirect_chain[-1]
    assert last_url == redirect
