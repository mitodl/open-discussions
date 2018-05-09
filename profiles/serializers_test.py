# pylint: disable=unused-argument
"""
Tests for serializers for profiles REST APIS
"""
import pytest

from profiles.models import Profile
from profiles.serializers import UserSerializer


def test_serialize_user(user):
    """
    Test serializing a user
    """
    profile = user.profile

    assert UserSerializer(user).data == {
        'id': user.id,
        'username': user.username,
        'profile': {
            'name': profile.name,
            'image': profile.image,
            'image_small': profile.image_small,
            'image_medium': profile.image_medium,
            'bio': profile.bio,
            'headline': profile.headline
        }
    }


def test_serialize_create_user(db, mocker):
    """
    Test creating a user
    """
    profile = {
        'name': 'name',
        'image': 'image',
        'image_small': 'image_small',
        'image_medium': 'image_medium',
        'email_optin': True,
        'toc_optin': True,
        'bio': 'bio',
        'headline': 'headline',
    }

    get_or_create_auth_tokens_stub = mocker.patch('profiles.serializers.get_or_create_auth_tokens')
    user = UserSerializer().create({
        'profile': profile
    })
    get_or_create_auth_tokens_stub.assert_called_once_with(user)

    del profile['email_optin']  # is write-only
    del profile['toc_optin']  # is write-only

    assert UserSerializer(user).data == {
        'id': user.id,
        'username': user.username,
        'profile': profile,
    }


@pytest.mark.parametrize("key,value", [
    ('name', 'name_value'),
    ('image', 'image_value'),
    ('image_small', 'image_small_value'),
    ('image_medium', 'image_medium_value'),
    ('email_optin', True),
    ('email_optin', False),
    ('bio', 'bio_value'),
    ('headline', 'headline_value'),
    ('toc_optin', True),
    ('toc_optin', False),
])
def test_update_user_profile(user, key, value):
    """
    Test creating a user
    """
    profile = user.profile
    expected_profile = {
        'name': profile.name,
        'image': profile.image,
        'image_small': profile.image_small,
        'image_medium': profile.image_medium,
        'email_optin': None,
        'toc_optoin': profile.toc_optin,
        'bio': profile.bio,
        'headline': profile.headline
    }

    expected_profile[key] = value

    serializer = UserSerializer(instance=user, data={
        'profile': {
            key: value,
        }
    })
    serializer.is_valid(raise_exception=True)
    serializer.save()

    profile2 = Profile.objects.first()

    for prop in ('name', 'image', 'image_small', 'image_medium', 'email_optin', 'toc_optin', 'bio', 'headline'):
        if prop == key:
            if isinstance(value, bool):
                assert getattr(profile2, prop) is value
            else:
                assert getattr(profile2, prop) == value
        else:
            assert getattr(profile2, prop) == getattr(profile, prop)
