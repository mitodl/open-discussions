"""Tests for views for REST APIs for users"""
import json

from django.core.urlresolvers import reverse
import pytest

from profiles.factories import ProfileFactory


# pylint: disable=redefined-outer-name, unused-argument
pytestmark = pytest.mark.django_db


def test_list_users(client, user):
    """
    List users
    """
    client.force_login(user)
    profile = ProfileFactory.create(user=user)
    url = reverse('user_api-list')
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'id': user.id,
            'username': user.username,
            'profile': {
                'name': profile.name,
                'image': profile.image,
                'image_small': profile.image_small,
                'image_medium': profile.image_medium,
            }
        }
    ]


def test_create_user(client, user):
    """
    Create a user and assert the response
    """
    client.force_login(user)
    url = reverse('user_api-list')
    payload = {
        'profile': {
            'name': 'name',
            'image': 'image',
            'image_small': 'image_small',
            'image_medium': 'image_medium',
        }
    }
    resp = client.post(url, data=json.dumps(payload), content_type='application/json')
    assert resp.status_code == 201
    assert resp.json()['profile'] == payload['profile']


def test_get_user(client, user):
    """
    Get a user
    """
    client.force_login(user)
    profile = ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.get(url)
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


def test_patch_user(client, user):
    """
    Update a users's profile
    """
    client.force_login(user)
    profile = ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data=json.dumps({
        'profile': {
            'name': 'othername',
        }
    }), content_type='application/json', format='json')
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


def test_patch_username(client, user):
    """
    Trying to update a users's username does not change anything
    """
    client.force_login(user)
    ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data=json.dumps({
        'username': 'notallowed'
    }), content_type='application/json', format='json')
    assert resp.status_code == 200
    assert resp.json()['username'] == user.username
