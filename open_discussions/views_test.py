"""
Test end to end django views.
"""
# pylint: disable=redefined-outer-name,too-many-arguments
import xml.etree.ElementTree as etree

import pytest
from django.urls import reverse
from rest_framework import status

from channels.factories.models import PostFactory, CommentFactory
from open_discussions import features

pytestmark = [pytest.mark.django_db]
lazy = pytest.lazy_fixture


@pytest.mark.parametrize(
    "env_id,secret_key,upload_url,feature_enabled,exp",
    [
        (None, None, None, False, False),
        (None, None, None, True, False),
        ("env", None, None, False, False),
        ("env", None, None, True, False),
        (None, None, "http://upload.com/url", False, False),
        (None, None, "http://upload.com/url", True, False),
        (None, "secret", None, False, False),
        (None, "secret", None, True, False),
        ("env", None, "http://upload.com/url", False, False),
        ("env", None, "http://upload.com/url", True, False),
        ("env", "secret", None, False, False),
        ("env", "secret", None, True, False),
        (None, "secret", "http://upload.com/url", False, False),
        (None, "secret", "http://upload.com/url", True, False),
        ("env", "secret", "http://upload.com/url", False, False),
        ("env", "secret", "http://upload.com/url", True, True),
    ],
)
def test_article_ui_flag(
    settings, client, env_id, secret_key, upload_url, feature_enabled, exp
):
    """make sure that the article ui flag is only true if feature and env vars are set"""
    settings.CKEDITOR_ENVIRONMENT_ID = env_id
    settings.CKEDITOR_SECRET_KEY = secret_key
    settings.CKEDITOR_UPLOAD_URL = upload_url
    settings.FEATURES[features.ARTICLE_UI] = feature_enabled

    response = client.get(reverse("open_discussions-index"))
    js_settings = response.context["js_settings"]
    assert js_settings["article_ui_enabled"] == exp


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
    """Test that old channel URL's are redirected to new ones"""
    response = client.get(url, follow=True)
    last_url, _ = response.redirect_chain[-1]
    assert last_url == redirect


@pytest.mark.parametrize("removed", [True, False])
def test_missing_post_404(client, removed):
    """Test that the 404 page works"""
    post = PostFactory.create(removed=removed)

    resp = client.get(
        reverse(
            "channel-post",
            kwargs=dict(
                channel_name=post.channel.name, post_id=post.post_id, post_slug="slug"
            ),
        )
    )
    if removed:
        assert resp.status_code == status.HTTP_404_NOT_FOUND
    else:
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.parametrize("removed", [True, False])
def test_missing_post_comments_404(client, removed):
    """Test that the 404 page works"""
    post = PostFactory.create(removed=removed)
    comment = CommentFactory.create()

    resp = client.get(
        reverse(
            "channel-post-comment",
            kwargs=dict(
                channel_name=post.channel.name,
                post_id=post.post_id,
                post_slug="slug",
                comment_id=comment.comment_id,
            ),
        )
    )
    if removed:
        assert resp.status_code == status.HTTP_404_NOT_FOUND
    else:
        assert resp.status_code == status.HTTP_200_OK


def test_facebook_user_agent(client):
    """Test that a Facebook crawler will be served a special html template"""
    response = client.get(
        "/",
        {},
        HTTP_USER_AGENT="facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    )
    assert response.templates[0].name == "social.html"
