"""Tests for views for REST APIs for channels"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from channels.factories import STRATEGY_BUILD
from open_discussions.factories import UserFactory

pytestmark = pytest.mark.betamax


def test_list_channels(client, jwt_header, private_channel_and_contributor, request):
    """
    List channels the user is subscribed to
    """
    channel, _ = private_channel_and_contributor
    url = reverse('channel-list')
    resp = client.get(url, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            'title': channel.title,
            'name': channel.name,
            'description': channel.description,
            'public_description': channel.public_description,
            'channel_type': channel.channel_type,
        }
    ]


def test_create_channel(client, staff_user, staff_jwt_header, reddit_factories):
    """
    Create a channel and assert the response
    """
    url = reverse('channel-list')
    channel = reddit_factories.channel("private", user=staff_user, strategy=STRATEGY_BUILD)
    payload = {
        'channel_type': channel.channel_type,
        'name': channel.name,
        'title': channel.title,
        'description': channel.description,
        'public_description': channel.public_description,
    }
    resp = client.post(url, data=payload, **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == payload


def test_create_channel_no_descriptions(client, staff_user, staff_jwt_header, reddit_factories):
    """
    Create a channel and assert the response for no descriptions
    """
    url = reverse('channel-list')
    channel = reddit_factories.channel("private", user=staff_user, strategy=STRATEGY_BUILD)
    payload = {
        'channel_type': channel.channel_type,
        'name': channel.name,
        'title': channel.title,
    }
    resp = client.post(url, data=payload, **staff_jwt_header)
    expected = dict(payload, description='', public_description='')
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == expected


def test_create_channel_already_exists(client, staff_jwt_header, private_channel):
    """
    Create a channel which already exists
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': private_channel.name,
        'title': 'Channel title',
        'description': 'a description of the channel',
        'public_description': 'public',
    }
    resp = client.post(url, data=payload, **staff_jwt_header)
    assert resp.status_code == status.HTTP_409_CONFLICT


def test_create_channel_nonstaff(client, jwt_header):
    """
    Try to create a channel with nonstaff auth and assert a failure
    """
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': 'a_channel',
        'title': 'Channel title',
        'description': 'a description of the channel',
        'public_description': 'public',
    }
    resp = client.post(url, data=payload, **jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_channel_noauth(client):
    """
    Try to create a channel with no auth and assert a failure
    """
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': 'a_channel',
        'title': 'Channel title',
        'description': 'a description of the channel',
        'public_description': 'public',
    }
    resp = client.post(url, data=payload)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_channel(client, jwt_header, private_channel_and_contributor):
    """
    Get a channel
    """
    channel, _ = private_channel_and_contributor
    url = reverse('channel-detail', kwargs={'channel_name': channel.name})
    resp = client.get(url, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'channel_type': channel.channel_type,
        'name': channel.name,
        'title': channel.title,
        'description': channel.description,
        'public_description': channel.public_description,
    }


def test_get_short_channel(client, jwt_header):
    """
    test getting a one-character channel name
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'a'})
    resp = client.get(url, **jwt_header)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_channel_forbidden(client):
    """
    If PRAW returns a 403 error we should also return a 403 error
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'xavier2'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_channel_not_found(client):
    """
    If PRAW returns a 404 error we should also return a 404 error
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'not_a_real_channel_name'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_patch_channel(client, staff_jwt_header, private_channel):
    """
    Update a channel's settings
    """
    url = reverse('channel-detail', kwargs={'channel_name': private_channel.name})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'channel_type': 'public',
        'name': private_channel.name,
        'title': private_channel.title,
        'description': private_channel.description,
        'public_description': private_channel.public_description,
    }


def test_patch_channel_moderator(client, jwt_header, staff_api, private_channel_and_contributor):
    """
    Update a channel's settings with a moderator user
    """
    private_channel, user = private_channel_and_contributor
    url = reverse('channel-detail', kwargs={'channel_name': private_channel.name})
    staff_api.add_moderator(user.username, private_channel.name)
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'channel_type': 'public',
        'name': private_channel.name,
        'title': private_channel.title,
        'description': private_channel.description,
        'public_description': private_channel.public_description,
    }


def test_patch_channel_forbidden(client, staff_jwt_header):
    """
    Update a channel's settings for a channel the user doesn't have permission to
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'dedp2'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_patch_channel_not_found(client, staff_jwt_header):
    """
    Update a channel's settings for a missing channel
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'missing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_patch_channel_nonstaff(client, jwt_header):
    """
    Fail to update a channel's settings if nonstaff user
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_patch_channel_noauth(client):
    """
    Fail to update a channel's settings if no auth
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
