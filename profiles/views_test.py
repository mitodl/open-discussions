"""Tests for views for REST APIs for users"""
import json

from django.core.urlresolvers import reverse
from rest_framework.authtoken.models import Token
import pytest

from profiles.factories import ProfileFactory


# pylint: disable=redefined-outer-name, unused-argument
pytestmark = pytest.mark.django_db

API_KWARGS = dict(content_type='application/json', format='json')


@pytest.fixture
def staff_token(admin_user):
    """Create a token for a staff user"""
    return Token.objects.create(user=admin_user)


@pytest.fixture
def user_token(user):
    """Create a token for a non-staff user"""
    return Token.objects.create(user=user)


def _authorization_header(token):
    """Generate a Authorization HTTP header"""
    return dict(HTTP_AUTHORIZATION='Token {}'.format(token.key))


def test_list_users(client, staff_token):
    """
    List users
    """
    user = staff_token.user
    profile = ProfileFactory.create(user=user)
    url = reverse('user_api-list')
    resp = client.get(url, **_authorization_header(staff_token))
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


def test_create_user(client, staff_token):
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
    resp = client.post(url, data=json.dumps(payload), **API_KWARGS, **_authorization_header(staff_token))
    assert resp.status_code == 201
    assert resp.json()['profile'] == payload['profile']


def test_get_user(client, staff_token):
    """
    Get a user
    """
    user = staff_token.user
    profile = ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.get(url, **_authorization_header(staff_token))
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


def test_patch_user(client, staff_token):
    """
    Update a users's profile
    """
    user = staff_token.user
    profile = ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data=json.dumps({
        'profile': {
            'name': 'othername',
        }
    }), **API_KWARGS, **_authorization_header(staff_token))
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


def test_patch_username(client, staff_token):
    """
    Trying to update a users's username does not change anything
    """
    user = staff_token.user
    ProfileFactory.create(user=user)
    url = reverse('user_api-detail', kwargs={'username': user.username})
    resp = client.patch(url, data=json.dumps({
        'username': 'notallowed'
    }), **API_KWARGS, **_authorization_header(staff_token))
    assert resp.status_code == 200
    assert resp.json()['username'] == user.username
