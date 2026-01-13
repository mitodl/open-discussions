# pylint: disable=unused-argument,too-many-arguments,redefined-outer-name
"""Tests for serializers for profiles REST APIS
"""
import factory
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError

from profiles.factories import UserWebsiteFactory
from profiles.models import FACEBOOK_DOMAIN, PERSONAL_SITE_TYPE, Profile
from profiles.serializers import (
    ProfileSerializer,
    UserSerializer,
    UserWebsiteSerializer,
)

small_gif = (
    b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04"
    b"\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02"
    b"\x02\x4c\x01\x00\x3b"
)


def test_serialize_user(user):
    """Test serializing a user"""
    profile = user.profile

    assert UserSerializer(user).data == {
        "id": user.id,
        "username": user.username,
        "profile": {
            "name": profile.name,
            "image": profile.image,
            "image_small": profile.image_small,
            "image_medium": profile.image_medium,
            "image_file": profile.image_file.url,
            "image_small_file": profile.image_small_file.url,
            "image_medium_file": profile.image_medium_file.url,
            "profile_image_small": profile.image_small_file.url,
            "profile_image_medium": profile.image_medium_file.url,
            "bio": profile.bio,
            "headline": profile.headline,
            "username": profile.user.username,
            "placename": profile.location["value"],
        },
    }


def test_serialize_create_user(db, mocker):
    """Test creating a user"""
    profile = {
        "name": "name",
        "image": "image",
        "image_small": "image_small",
        "image_medium": "image_medium",
        "email_optin": True,
        "toc_optin": True,
        "bio": "bio",
        "headline": "headline",
        "placename": "",
    }

    serializer = UserSerializer(data={"email": "test@localhost", "profile": profile})
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    del profile["email_optin"]  # is write-only
    del profile["toc_optin"]  # is write-only

    profile.update(
        {
            "image_file": None,
            "image_small_file": None,
            "image_medium_file": None,
            "profile_image_small": "image_small",
            "profile_image_medium": "image_medium",
            "username": user.username,
        }
    )
    assert UserSerializer(user).data == {
        "id": user.id,
        "username": user.username,
        "profile": profile,
    }


@pytest.mark.parametrize(
    "key,value",
    [
        ("name", "name_value"),
        ("image", "image_value"),
        ("image_small", "image_small_value"),
        ("image_medium", "image_medium_value"),
        ("email_optin", True),
        ("email_optin", False),
        ("bio", "bio_value"),
        ("headline", "headline_value"),
        ("toc_optin", True),
        ("toc_optin", False),
    ],
)
def test_update_user_profile(mocker, user, key, value):
    """Test updating a profile via the UserSerializer"""
    mock_after_profile_created_or_updated = mocker.patch(
        "profiles.serializers.after_profile_created_or_updated"
    )
    profile = user.profile

    serializer = UserSerializer(
        instance=user, data={"profile": {key: value}}, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    profile2 = Profile.objects.get(user=user)

    for prop in (
        "name",
        "image",
        "image_small",
        "image_medium",
        "email_optin",
        "toc_optin",
        "bio",
        "headline",
    ):
        if prop == key:
            if isinstance(value, bool):
                assert getattr(profile2, prop) is value
            else:
                assert getattr(profile2, prop) == value
        else:
            assert getattr(profile2, prop) == getattr(profile, prop)

    mock_after_profile_created_or_updated.assert_called_once_with(profile)


@pytest.mark.parametrize(
    "data,is_valid",
    [
        ({}, True),
        ("notjson", False),
        ({"bad": "json"}, False),
        (None, True),
        ({"value": "city"}, True),
    ],
)
def test_location_validation(user, data, is_valid):
    """Test that lcoation validation works correctly"""
    serializer = ProfileSerializer(
        instance=user.profile, data={"location": data}, partial=True
    )
    assert serializer.is_valid(raise_exception=False) is is_valid


@pytest.mark.parametrize(
    "key,value",
    [
        ("name", "name_value"),
        ("bio", "bio_value"),
        ("headline", "headline_value"),
        ("location", {"value": "Hobbiton, The Shire, Middle-Earth"}),
        (
            "image_file",
            SimpleUploadedFile("small.gif", small_gif, content_type="image/gif"),
        ),
    ],
)
def test_update_profile(mocker, user, key, value):
    """Test updating a profile via the ProfileSerializer"""
    mock_after_profile_created_or_updated = mocker.patch(
        "profiles.serializers.after_profile_created_or_updated"
    )
    profile = user.profile

    serializer = ProfileSerializer(
        instance=user.profile, data={key: value}, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    profile2 = Profile.objects.first()

    for prop in (
        "name",
        "image_file",
        "email_optin",
        "toc_optin",
        "bio",
        "headline",
        "location",
    ):
        if prop == key:
            if isinstance(value, bool):
                assert getattr(profile2, prop) is value
            elif key == "image_file":
                assert getattr(profile2, prop).read() == small_gif
            else:
                assert getattr(profile2, prop) == value
        else:
            assert getattr(profile2, prop) == getattr(profile, prop)

    mock_after_profile_created_or_updated.assert_called_once_with(profile)


def test_serialize_profile_websites(user):
    """Tests that the ProfileSerializer includes UserWebsite information when an option is set via the context"""
    profile = user.profile
    user_websites = UserWebsiteFactory.create_batch(
        2,
        profile=profile,
        site_type=factory.Iterator([PERSONAL_SITE_TYPE, FACEBOOK_DOMAIN]),
    )
    serialized_profile = ProfileSerializer(
        profile, context={"include_user_websites": True}
    ).data
    serialized_sites = UserWebsiteSerializer(user_websites, many=True).data
    assert len(serialized_profile["user_websites"]) == 2
    # Check that the two lists of OrderedDicts are equivalent
    assert sorted(
        [list(data.items()) for data in serialized_profile["user_websites"]]
    ) == sorted([list(data.items()) for data in serialized_sites])


class TestUserWebsiteSerializer:
    """UserWebsiteSerializer tests"""

    def test_serialize(self):
        """Test serializing a user website"""
        user_website = UserWebsiteFactory.build()
        assert UserWebsiteSerializer(user_website).data == {
            "id": user_website.id,
            "url": user_website.url,
            "site_type": user_website.site_type,
        }

    def test_deserialize(self, mocker, user):
        """Test deserializing a user website"""
        url = "https://example.com"
        site_type = "dummy"
        patched_get_site_type = mocker.patch(
            "profiles.serializers.get_site_type_from_url", return_value=site_type
        )
        user_website_data = {"username": user.username, "url": url}

        serializer = UserWebsiteSerializer(data=user_website_data)
        is_valid = serializer.is_valid(raise_exception=True)
        assert is_valid is True
        assert serializer.validated_data["url"] == url
        assert serializer.validated_data["site_type"] == site_type
        assert serializer.validated_data["profile"] == user.profile
        patched_get_site_type.assert_called_once_with(url)

    @pytest.mark.parametrize(
        "input_url,exp_result_url",
        [("HTtPS://AbC.COM", "https://abc.com"), ("AbC.cOM", "http://abc.com")],
    )
    def test_user_website_url(self, mocker, user, input_url, exp_result_url):
        """Test that deserializing a user website url adds a protocol if necessary and forces lowercase."""
        site_type = "dummy"
        mocker.patch(
            "profiles.serializers.get_site_type_from_url", return_value=site_type
        )
        user_website_data = {"username": user.username, "url": input_url}

        serializer = UserWebsiteSerializer(data=user_website_data)
        is_valid = serializer.is_valid(raise_exception=True)
        assert is_valid is True
        assert serializer.validated_data["url"] == exp_result_url

    def test_site_uniqueness(self, user):
        """Test that a user can only save one of a specific type of site"""
        UserWebsiteFactory.create(
            profile=user.profile, url="facebook.com/1", site_type=FACEBOOK_DOMAIN
        )
        user_website_data = {"username": user.username, "url": "facebook.com/2"}
        serializer = UserWebsiteSerializer(data=user_website_data)
        with pytest.raises(
            ValidationError, match="A website of this type has already been saved."
        ):
            serializer.is_valid(raise_exception=True)
            serializer.save()
