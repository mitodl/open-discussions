"""Tests for views for REST APIs for users"""
from os.path import splitext, basename

from django.contrib.auth.models import User
from django.urls import reverse
import pytest


# pylint: disable=redefined-outer-name, unused-argument, too-many-arguments
from profiles.utils import make_temp_image_file

pytestmark = pytest.mark.django_db


def test_list_users(client, staff_user, staff_jwt_header):
    """
    List users
    """
    profile = staff_user.profile
    url = reverse('user_api-list')
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'id': staff_user.id,
            'username': staff_user.username,
            'profile': {
                'name': profile.name,
                'image': profile.image,
                'image_small': profile.image_small,
                'image_medium': profile.image_medium,
                'image_file': 'http://testserver{}'.format(profile.image_file.url),
                'image_small_file': 'http://testserver{}'.format(profile.image_small_file.url),
                'image_medium_file': 'http://testserver{}'.format(profile.image_medium_file.url),
                'bio': profile.bio,
                'headline': profile.headline
            }
        }
    ]


# These can be removed once all clients have been updated and are sending both these fields
@pytest.mark.parametrize('email', ['', 'test.email@example.com'])
@pytest.mark.parametrize('email_optin', [None, True, False])
@pytest.mark.parametrize('toc_optin', [None, True, False])
def test_create_user(
        client, staff_user, staff_jwt_header, mocker, email, email_optin, toc_optin
):  # pylint: disable=too-many-arguments
    """
    Create a user and assert the response
    """
    staff_user.email = ''
    staff_user.profile.email_optin = None
    staff_user.profile.save()
    staff_user.save()
    url = reverse('user_api-list')
    payload = {
        'profile': {
            'name': 'name',
            'image': 'image',
            'image_small': 'image_small',
            'image_medium': 'image_medium',
            'bio': 'bio',
            'headline': 'headline'
        }
    }
    if email:
        payload['email'] = email
    if email_optin is not None:
        payload['profile']['email_optin'] = email_optin
    if toc_optin is not None:
        payload['profile']['toc_optin'] = toc_optin
    get_or_create_auth_tokens_stub = mocker.patch('profiles.serializers.get_or_create_auth_tokens')
    ensure_notifications_stub = mocker.patch('profiles.serializers.ensure_notification_settings')
    resp = client.post(url, data=payload, **staff_jwt_header)
    assert resp.status_code == 201
    for optin in ('email_optin', 'toc_optin'):
        if optin in payload['profile']:
            del payload['profile'][optin]
    payload['profile'].update({
        'image_file': None,
        'image_small_file': None,
        'image_medium_file': None
    })
    assert resp.json()['profile'] == payload['profile']
    user = User.objects.get(username=resp.json()['username'])
    get_or_create_auth_tokens_stub.assert_called_once_with(user)
    ensure_notifications_stub.assert_called_once_with(user)
    assert user.email == email
    assert user.profile.email_optin is email_optin
    assert user.profile.toc_optin is toc_optin


def test_get_user(client, user, staff_jwt_header):
    """
    Get a user
    """
    profile = user.profile
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json() == {
        'id': user.id,
        'username': user.username,
        'profile': {
            'name': profile.name,
            'image': profile.image,
            'image_small': profile.image_small,
            'image_medium': profile.image_medium,
            'image_file': 'http://testserver{}'.format(profile.image_file.url),
            'image_small_file': 'http://testserver{}'.format(profile.image_small_file.url),
            'image_medium_file': 'http://testserver{}'.format(profile.image_medium_file.url),
            'bio': profile.bio,
            'headline': profile.headline,
        }
    }


# These can be removed once all clients have been updated and are sending both these fields
@pytest.mark.parametrize('email', ['', 'test.email@example.com'])
@pytest.mark.parametrize('email_optin', [None, True, False])
@pytest.mark.parametrize('toc_optin', [None, True, False])
def test_patch_user(client, user, staff_jwt_header, email, email_optin, toc_optin):
    """
    Update a users' profile
    """
    user.email = ''
    user.save()
    profile = user.profile
    profile.email_optin = None
    profile.save()
    payload = {
        'profile': {
            'name': 'othername',
        }
    }
    if email:
        payload['email'] = email
    if email_optin is not None:
        payload['profile']['email_optin'] = email_optin
    if toc_optin is not None:
        payload['profile']['toc_optin'] = toc_optin
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data=payload, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json() == {
        'id': user.id,
        'username': user.username,
        'profile': {
            'name': 'othername',
            'image': profile.image,
            'image_small': profile.image_small,
            'image_medium': profile.image_medium,
            'image_file': 'http://testserver{}'.format(profile.image_file.url),
            'image_small_file': 'http://testserver{}'.format(profile.image_small_file.url),
            'image_medium_file': 'http://testserver{}'.format(profile.image_medium_file.url),
            'bio': profile.bio,
            'headline': profile.headline,
        }
    }
    user.refresh_from_db()
    profile.refresh_from_db()
    assert user.email == email
    assert profile.email_optin is email_optin
    assert profile.toc_optin is toc_optin


def test_patch_username(client, user, staff_jwt_header):
    """
    Trying to update a users's username does not change anything
    """
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data={
        'username': 'notallowed'
    }, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json()['username'] == user.username


def test_patch_profile_by_user(client, logged_in_profile):
    """
    Test that users can update their profiles, including profile images
    """
    url = reverse('profile_api-detail', kwargs={'user__username': logged_in_profile.user.username})
    # create a dummy image file in memory for upload
    with make_temp_image_file(width=50, height=50) as image_file:
        # format patch using multipart upload
        resp = client.patch(url, data={
            'bio': 'updated_bio_value',
            'image_small_file': image_file
        }, format='multipart')
    filename, ext = splitext(image_file.name)
    assert resp.status_code == 200
    assert resp.json()['bio'] == 'updated_bio_value'
    assert basename(filename) in resp.json()['image_small_file']
    assert resp.json()['image_small_file'].endswith(ext)
