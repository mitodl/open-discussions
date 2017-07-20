"""Tests for views for REST APIs for channels"""
from django.core.urlresolvers import reverse

from open_discussions.factories import UserFactory


# pylint: disable=redefined-outer-name, unused-argument
def test_list_channels(client, use_betamax, praw_settings, db):
    """
    List channels the user is subscribed to
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-list')
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'channel_type': 'public',
            'name': 'pics',
            'title': '/r/pics',
        },
        {
            'channel_type': 'public',
            'name': 'videos',
            'title': '/r/videos',
        },
        {
            'channel_type': 'public',
            'name': 'askhistorians',
            'title': '/r/askhistorians',
        }
    ]


def test_create_channel(client, use_betamax, praw_settings, db):
    """
    Create a channel and assert the response
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': 'unit_tests',
        'title': 'A place for tests',
    }
    resp = client.post(url, data=payload)
    assert resp.status_code == 201
    assert resp.json() == payload


def test_get_channel(client, use_betamax, praw_settings, db):
    """
    Get a channel
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'unit_tests'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == {
        'channel_type': 'private',
        'name': 'unit_tests',
        'title': 'A place for tests',
    }


def test_patch_channel(client, use_betamax, praw_settings, db):
    """
    Update a channel's settings
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'unit_tests'})
    resp = client.patch(url, {
        'title': 'A new title',
    }, format='json')
    assert resp.status_code == 200
    assert resp.json() == {
        'channel_type': 'public',
        'name': 'unit_tests',
        'title': 'A new title',
    }
