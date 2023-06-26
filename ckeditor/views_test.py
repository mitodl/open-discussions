"""tests for the ckeditor view"""
from time import time
import math
import pytest
import jwt

from django.urls import reverse
from rest_framework import status
from open_discussions.features import ARTICLE_UI


def test_get_ckeditor(client, user, settings):
    """test that a JWT is sent up"""
    settings.CKEDITOR_SECRET_KEY = "super secret"
    settings.FEATURES[ARTICLE_UI] = True
    settings.CKEDITOR_ENVIRONMENT_ID = "environment"
    client.force_login(user)
    resp = client.get(reverse("ckeditor-token"))
    assert resp.status_code == status.HTTP_200_OK
    jwt_body = jwt.decode(
        resp.content, settings.CKEDITOR_SECRET_KEY, algorithms=["HS256"]
    )
    assert jwt_body["iss"] == settings.CKEDITOR_ENVIRONMENT_ID
    assert jwt_body["iat"] <= math.floor(time())


@pytest.mark.parametrize(
    "secret_key,feature_enabled,env_id,exp_status",
    [
        (None, False, None, status.HTTP_503_SERVICE_UNAVAILABLE),
        ("secret", False, None, status.HTTP_503_SERVICE_UNAVAILABLE),
        (None, False, "env", status.HTTP_503_SERVICE_UNAVAILABLE),
        (None, True, None, status.HTTP_503_SERVICE_UNAVAILABLE),
        ("secret", False, "env", status.HTTP_503_SERVICE_UNAVAILABLE),
        ("secret", True, None, status.HTTP_503_SERVICE_UNAVAILABLE),
        (None, True, "env", status.HTTP_503_SERVICE_UNAVAILABLE),
        ("secret", True, "env", status.HTTP_200_OK),
    ],
)
def test_get_ckeditor_status(
    client, user, settings, secret_key, feature_enabled, env_id, exp_status
):  # pylint: disable=too-many-arguments
    """test that we return the status we expect"""
    settings.CKEDITOR_SECRET_KEY = secret_key
    settings.FEATURES[ARTICLE_UI] = feature_enabled
    settings.CKEDITOR_ENVIRONMENT_ID = env_id
    client.force_login(user)
    resp = client.get(reverse("ckeditor-token"))
    assert resp.status_code == exp_status
