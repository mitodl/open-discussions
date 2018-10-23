"""Tests for views for REST APIs for users"""
# pylint: disable=redefined-outer-name, unused-argument, too-many-arguments
from os.path import splitext, basename

from django.contrib.auth.models import User
from django.urls import reverse
import pytest
from social_django.models import UserSocialAuth

from authentication.backends.micromasters import MicroMastersAuth
from profiles.utils import make_temp_image_file, DEFAULT_PROFILE_IMAGE

pytestmark = pytest.mark.django_db


def test_list_users(staff_client, staff_user):
    """
    List users
    """
    profile = staff_user.profile
    url = reverse("user_api-list")
    resp = staff_client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            "id": staff_user.id,
            "username": staff_user.username,
            "profile": {
                "name": profile.name,
                "image": profile.image,
                "image_small": profile.image_small,
                "image_medium": profile.image_medium,
                "image_file": "http://testserver{}".format(profile.image_file.url),
                "image_small_file": "http://testserver{}".format(
                    profile.image_small_file.url
                ),
                "image_medium_file": "http://testserver{}".format(
                    profile.image_medium_file.url
                ),
                "profile_image_small": profile.image_small_file.url,
                "profile_image_medium": profile.image_medium_file.url,
                "bio": profile.bio,
                "headline": profile.headline,
                "username": staff_user.username,
            },
        }
    ]


# These can be removed once all clients have been updated and are sending both these fields
@pytest.mark.parametrize("uid", [None, "abc123"])
@pytest.mark.parametrize("email_optin", [None, True, False])
@pytest.mark.parametrize("toc_optin", [None, True, False])
def test_create_user(
    staff_client, staff_user, mocker, uid, email_optin, toc_optin
):  # pylint: disable=too-many-arguments
    """
    Create a user and assert the response
    """
    staff_user.email = ""
    staff_user.profile.email_optin = None
    staff_user.profile.save()
    staff_user.save()
    url = reverse("user_api-list")
    email = "test.email@example.com"
    payload = {
        "email": email,
        "profile": {
            "name": "name",
            "image": "image",
            "image_small": "image_small",
            "image_medium": "image_medium",
            "bio": "bio",
            "headline": "headline",
        },
    }
    if uid:
        payload["uid"] = uid
    if email_optin is not None:
        payload["profile"]["email_optin"] = email_optin
    if toc_optin is not None:
        payload["profile"]["toc_optin"] = toc_optin
    assert (
        UserSocialAuth.objects.filter(provider=MicroMastersAuth.name, uid=uid).exists()
        is False
    )
    get_or_create_auth_tokens_stub = mocker.patch(
        "channels.api.get_or_create_auth_tokens"
    )
    ensure_notifications_stub = mocker.patch(
        "notifications.api.ensure_notification_settings"
    )
    resp = staff_client.post(url, data=payload)
    user = User.objects.get(username=resp.json()["username"])
    assert resp.status_code == 201
    for optin in ("email_optin", "toc_optin"):
        if optin in payload["profile"]:
            del payload["profile"][optin]
    payload["profile"].update(
        {
            "image_file": None,
            "image_small_file": None,
            "image_medium_file": None,
            "username": user.username,
            "profile_image_small": "image_small",
            "profile_image_medium": "image_medium",
        }
    )
    assert resp.json()["profile"] == payload["profile"]
    get_or_create_auth_tokens_stub.assert_called_once_with(user)
    ensure_notifications_stub.assert_called_once_with(user)
    assert user.email == email
    assert user.profile.email_optin is email_optin
    assert user.profile.toc_optin is toc_optin
    assert UserSocialAuth.objects.filter(
        provider=MicroMastersAuth.name, uid=uid
    ).exists() is (uid is not None)


def test_get_user(staff_client, user):
    """
    Get a user
    """
    profile = user.profile
    url = reverse("user_api-detail", kwargs={"username": user.username})
    resp = staff_client.get(url)
    assert resp.status_code == 200
    assert resp.json() == {
        "id": user.id,
        "username": user.username,
        "profile": {
            "name": profile.name,
            "image": profile.image,
            "image_small": profile.image_small,
            "image_medium": profile.image_medium,
            "image_file": "http://testserver{}".format(profile.image_file.url),
            "image_small_file": "http://testserver{}".format(
                profile.image_small_file.url
            ),
            "image_medium_file": "http://testserver{}".format(
                profile.image_medium_file.url
            ),
            "profile_image_small": profile.image_small_file.url,
            "profile_image_medium": profile.image_medium_file.url,
            "bio": profile.bio,
            "headline": profile.headline,
            "username": profile.user.username,
        },
    }


@pytest.mark.parametrize("uid", [None, "abc123"])
@pytest.mark.parametrize("email", ["", "test.email@example.com"])
@pytest.mark.parametrize("email_optin", [None, True, False])
@pytest.mark.parametrize("toc_optin", [None, True, False])
def test_patch_user(staff_client, user, uid, email, email_optin, toc_optin):
    """
    Update a users' profile
    """
    user.email = ""
    user.save()
    profile = user.profile
    profile.email_optin = None
    profile.save()
    payload = {"profile": {"name": "othername"}}
    if email:
        payload["email"] = email
    if uid:
        payload["uid"] = uid
    if email_optin is not None:
        payload["profile"]["email_optin"] = email_optin
    if toc_optin is not None:
        payload["profile"]["toc_optin"] = toc_optin
    assert (
        UserSocialAuth.objects.filter(provider=MicroMastersAuth.name, uid=uid).exists()
        is False
    )
    url = reverse("user_api-detail", kwargs={"username": user.username})
    resp = staff_client.patch(url, data=payload)
    assert resp.status_code == 200
    assert resp.json() == {
        "id": user.id,
        "username": user.username,
        "profile": {
            "name": "othername",
            "image": profile.image,
            "image_small": profile.image_small,
            "image_medium": profile.image_medium,
            "image_file": "http://testserver{}".format(profile.image_file.url),
            "image_small_file": "http://testserver{}".format(
                profile.image_small_file.url
            ),
            "image_medium_file": "http://testserver{}".format(
                profile.image_medium_file.url
            ),
            "profile_image_small": profile.image_small_file.url,
            "profile_image_medium": profile.image_medium_file.url,
            "bio": profile.bio,
            "headline": profile.headline,
            "username": profile.user.username,
        },
    }
    user.refresh_from_db()
    profile.refresh_from_db()
    assert user.email == email
    assert profile.email_optin is email_optin
    assert profile.toc_optin is toc_optin
    assert UserSocialAuth.objects.filter(
        provider=MicroMastersAuth.name, uid=uid
    ).exists() is (uid is not None)


def test_patch_username(staff_client, user):
    """
    Trying to update a users's username does not change anything
    """
    url = reverse("user_api-detail", kwargs={"username": user.username})
    resp = staff_client.patch(url, data={"username": "notallowed"})
    assert resp.status_code == 200
    assert resp.json()["username"] == user.username


def test_patch_profile_by_user(client, logged_in_profile):
    """
    Test that users can update their profiles, including profile images
    """
    url = reverse(
        "profile_api-detail", kwargs={"user__username": logged_in_profile.user.username}
    )
    # create a dummy image file in memory for upload
    with make_temp_image_file(width=250, height=250) as image_file:
        # format patch using multipart upload
        resp = client.patch(
            url,
            data={"bio": "updated_bio_value", "image_file": image_file},
            format="multipart",
        )
    filename, ext = splitext(image_file.name)
    assert resp.status_code == 200
    assert resp.json()["bio"] == "updated_bio_value"
    assert basename(filename) in resp.json()["image_file"]
    assert resp.json()["image_file"].endswith(ext)
    assert resp.json()["image_small_file"].endswith(".jpg")

    logged_in_profile.refresh_from_db()
    assert logged_in_profile.image_file.height == 250
    assert logged_in_profile.image_file.width == 250
    assert logged_in_profile.image_small_file.height == 64
    assert logged_in_profile.image_small_file.width == 64
    assert logged_in_profile.image_medium_file.height == 128
    assert logged_in_profile.image_medium_file.width == 128


def test_initialized_avatar(client, user):
    """
    Test that a PNG avatar image is returned for a user
    """
    url = reverse(
        "name-initials-avatar",
        kwargs={
            "username": user.username,
            "color": "afafaf",
            "bgcolor": "dedede",
            "size": 92,
        },
    )
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.__getitem__("Content-Type") == "image/png"


def test_initials_avatar_fake_user(client):
    """
    Test that a default avatar image is returned for a fake user
    """
    url = reverse(
        "name-initials-avatar",
        kwargs={
            "username": "fakeuser",
            "color": "afafaf",
            "bgcolor": "dedede",
            "size": 92,
        },
    )
    response = client.get(url, follow=True)
    last_url, _ = response.redirect_chain[-1]
    assert last_url.endswith(DEFAULT_PROFILE_IMAGE)
