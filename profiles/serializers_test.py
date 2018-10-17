# pylint: disable=unused-argument,too-many-arguments
"""
Tests for serializers for profiles REST APIS
"""
import pytest

from open_discussions.features import INDEX_UPDATES
from profiles.models import Profile
from profiles.serializers import UserSerializer, ProfileSerializer


def test_serialize_user(user):
    """
    Test serializing a user
    """
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
        },
    }


def test_serialize_create_user(db, mocker):
    """
    Test creating a user
    """
    profile = {
        "name": "name",
        "image": "image",
        "image_small": "image_small",
        "image_medium": "image_medium",
        "email_optin": True,
        "toc_optin": True,
        "bio": "bio",
        "headline": "headline",
    }

    get_or_create_auth_tokens_stub = mocker.patch(
        "channels.api.get_or_create_auth_tokens"
    )
    serializer = UserSerializer(data={"email": "test@localhost", "profile": profile})
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    get_or_create_auth_tokens_stub.assert_called_once_with(user)

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
    "key,value,update_posts",
    [
        ("name", "name_value", True),
        ("image", "image_value", True),
        ("image_small", "image_small_value", True),
        ("image_medium", "image_medium_value", True),
        ("email_optin", True, False),
        ("email_optin", False, False),
        ("bio", "bio_value", False),
        ("headline", "headline_value", False),
        ("toc_optin", True, False),
        ("toc_optin", False, False),
    ],
)
def test_update_user_profile(user, key, value, update_posts, settings, mocker):
    """
    Test updating a profile via the UserSerializer
    """
    settings.FEATURES[INDEX_UPDATES] = True
    mock_update_posts = mocker.patch(
        "profiles.serializers.update_author_posts_comments"
    )
    mock_update_author = mocker.patch("profiles.serializers.update_author")
    profile = user.profile

    serializer = UserSerializer(
        instance=user, data={"profile": {key: value}}, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    profile2 = Profile.objects.first()

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

    mock_update_author.assert_called_once_with(profile2)
    assert mock_update_posts.call_count == (1 if update_posts else 0)


@pytest.mark.parametrize(
    "key,value",
    [("name", "name_value"), ("bio", "bio_value"), ("headline", "headline_value")],
)
def test_update_profile(user, key, value, settings, mocker):
    """
    Test updating a profile via the ProfileSerializer
    """
    settings.FEATURES[INDEX_UPDATES] = True
    mock_update_posts = mocker.patch(
        "profiles.serializers.update_author_posts_comments"
    )
    mock_update_author = mocker.patch("profiles.serializers.update_author")
    profile = user.profile

    serializer = ProfileSerializer(
        instance=user.profile, data={key: value}, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()

    profile2 = Profile.objects.first()

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

    if key == "name":
        mock_update_posts.assert_called_once_with(profile2)
    else:
        mock_update_posts.assert_not_called()
    mock_update_author.assert_called_with(profile2)
