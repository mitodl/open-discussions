"""Tests for views for REST APIs for channels"""
from django.core.urlresolvers import reverse


# pylint: disable=redefined-outer-name, unused-argument
def test_list_channels(client, use_betamax, praw_settings):
    """
    List channels the user is subscribed to
    """
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


def test_create_channel(client, use_betamax, praw_settings):
    """
    Create a channel and assert the response
    """
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': 'unit_tests',
        'title': 'A place for tests',
    }
    resp = client.post(url, data=payload)
    assert resp.status_code == 201
    assert resp.json() == payload


def test_get_channel(client, use_betamax, praw_settings):
    """
    Get a channel
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'unit_tests'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == {
        'channel_type': 'private',
        'name': 'unit_tests',
        'title': 'A place for tests',
    }


def test_patch_channel(client, use_betamax, praw_settings):
    """
    Update a channel's settings
    """
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
