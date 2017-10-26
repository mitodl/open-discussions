"""Tests for views for REST APIs for users"""
import json

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
import pytest

from profiles.factories import ProfileFactory


# pylint: disable=redefined-outer-name, unused-argument
pytestmark = pytest.mark.django_db

API_KWARGS = dict(content_type='application/json', format='json')


def test_list_users(client, admin_user, staff_jwt_header):
    """
    List users
    """
    profile = ProfileFactory.create(user=admin_user)
    url = reverse('user_api-list')
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'id': admin_user.id,
            'username': admin_user.username,
            'profile': {
                'name': profile.name,
                'image': profile.image,
                'image_small': profile.image_small,
                'image_medium': profile.image_medium,
            }
        }
    ]


def test_create_user(client, staff_jwt_header, mocker):
    """
    Create a user and assert the response
    """
    url = reverse('user_api-list')
    payload = {
        'profile': {
            'name': 'name',
            'image': 'image',
            'image_small': 'image_small',
            'image_medium': 'image_medium',
        }
    }
    get_or_create_auth_tokens_stub = mocker.patch('profiles.serializers.get_or_create_auth_tokens')
    resp = client.post(url, data=json.dumps(payload), **API_KWARGS, **staff_jwt_header)
    assert resp.status_code == 201
    assert resp.json()['profile'] == payload['profile']
    get_or_create_auth_tokens_stub.assert_called_once_with(User.objects.get(username=resp.json()['username']))


def test_get_user(client, user, staff_jwt_header):
    """
    Get a user
    """
    profile = ProfileFactory.create(user=user)
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
        }
    }


def test_patch_user(client, user, staff_jwt_header):
    """
    Update a users' profile
    """
    profile = ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data=json.dumps({
        'profile': {
            'name': 'othername',
        }
    }), **API_KWARGS, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json() == {
        'id': user.id,
        'username': user.username,
        'profile': {
            'name': 'othername',
            'image': profile.image,
            'image_small': profile.image_small,
            'image_medium': profile.image_medium,
        }
    }


def test_patch_username(client, user, staff_jwt_header):
    """
    Trying to update a users's username does not change anything
    """
    ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data=json.dumps({
        'username': 'notallowed'
    }), **API_KWARGS, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json()['username'] == user.username
