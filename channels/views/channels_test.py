"""Tests for views for REST APIs for channels"""
# pylint: disable=unused-argument
import os.path

import pytest
from django.urls import reverse
from rest_framework import status

from channels.constants import LINK_TYPE_ANY
from channels.factories import STRATEGY_BUILD
from channels.models import Channel
from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

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
            'user_is_contributor': True,
            'user_is_moderator': False,
            'link_type': channel.link_type,
            'membership_is_managed': False,
            'avatar': None,
            'banner': None,
        }
    ]


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_list_channels_anonymous(client, settings, allow_anonymous):
    """
    List anonymous channels
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('channel-list')
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        # Until we decide otherwise this should always be an empty list.
        assert resp.json() == []
    else:
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


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
        'link_type': channel.link_type,
    }
    resp = client.post(url, data=payload, **staff_jwt_header)
    expected = {
        **payload,
        'user_is_contributor': True,
        'user_is_moderator': True,
        'membership_is_managed': True,
        'avatar': None,
        'banner': None,
    }
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == expected


def test_create_channel_no_descriptions(client, staff_user, staff_jwt_header, reddit_factories):
    """
    Create a channel and assert the response for no descriptions
    """
    url = reverse('channel-list')
    channel = reddit_factories.channel("private", user=staff_user, strategy=STRATEGY_BUILD)
    payload = {
        'channel_type': channel.channel_type,
        'link_type': 'any',
        'name': channel.name,
        'title': channel.title,
    }
    resp = client.post(url, data=payload, **staff_jwt_header)
    expected = {
        **payload,
        'description': '',
        'public_description': '',
        'user_is_contributor': True,
        'user_is_moderator': True,
        'membership_is_managed': True,
        'avatar': None,
        'banner': None,
    }
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
        'link_type': private_channel.link_type,
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
        'link_type': LINK_TYPE_ANY,
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
        'user_is_contributor': True,
        'user_is_moderator': False,
        'link_type': channel.link_type,
        'membership_is_managed': False,
        'avatar': None,
        'banner': None,
    }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_get_channel_anonymous(client, public_channel, settings, allow_anonymous):
    """
    An anonymous user should be able to see a public channel
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('channel-detail', kwargs={'channel_name': public_channel.name})
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            'channel_type': public_channel.channel_type,
            'name': public_channel.name,
            'title': public_channel.title,
            'description': public_channel.description,
            'public_description': public_channel.public_description,
            'user_is_contributor': False,
            'user_is_moderator': False,
            'link_type': public_channel.link_type,
            'membership_is_managed': False,
            'avatar': None,
            'banner': None,
        }
    else:
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_short_channel(client, jwt_header):
    """
    test getting a one-character channel name
    """
    Channel.objects.create(name='a')
    url = reverse('channel-detail', kwargs={'channel_name': 'a'})
    resp = client.get(url, **jwt_header)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_channel_forbidden(client):
    """
    If PRAW returns a 403 error we should also return a 403 error
    """
    Channel.objects.create(name='xavier2')
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'xavier2'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_channel_not_found(client):
    """
    If PRAW returns a 404 error we should also return a 404 error
    """
    client.force_login(UserFactory.create())
    Channel.objects.create(name='not_a_real_channel_name')
    url = reverse('channel-detail', kwargs={'channel_name': 'not_a_real_channel_name'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_channel_with_avatar_banner(client, staff_jwt_header, public_channel):
    """
    If a channel has an image we should show its URL
    """
    channel = Channel.objects.get(name=public_channel.name)
    channel.avatar = 'avatar'
    channel.banner = 'banner'
    channel.save()

    url = reverse('channel-detail', kwargs={'channel_name': public_channel.name})
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['avatar'] == '/media/avatar'
    assert resp.json()['banner'] == '/media/banner'


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
        'link_type': private_channel.link_type,
        'name': private_channel.name,
        'title': private_channel.title,
        'description': private_channel.description,
        'public_description': private_channel.public_description,
        'user_is_contributor': True,
        'user_is_moderator': True,
        'membership_is_managed': False,
        'avatar': None,
        'banner': None,
    }
    assert Channel.objects.count() == 1
    channel_obj = Channel.objects.first()
    assert channel_obj.name == private_channel.name
    assert channel_obj.membership_is_managed is False


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
        'user_is_contributor': True,
        'user_is_moderator': True,
        'link_type': private_channel.link_type,
        'membership_is_managed': False,
        'avatar': None,
        'banner': None,
    }


@pytest.mark.parametrize("field", ["avatar", "banner"])
def test_patch_channel_image(client, public_channel, staff_jwt_header, field):
    """
    Update a channel's avatar
    """
    url = reverse('channel-detail', kwargs={'channel_name': public_channel.name})
    png_file = os.path.join(os.path.dirname(__file__), "..", "..", "static", "images", "blank.png")
    with open(png_file, "rb") as f:
        resp = client.patch(url, {
            field:  f
        }, format='multipart', **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    image = getattr(Channel.objects.get(name=public_channel.name), field)

    assert image.name.startswith(f"channel_{field}_") is True
    assert len(image.read()) == os.path.getsize(png_file)


@pytest.mark.parametrize("field", ["avatar", "banner"])
def test_patch_channel_validate_image(client, private_channel, staff_jwt_header, field):
    """
    It should error if the avatar or banner patch object is not a file
    """
    url = reverse('channel-detail', kwargs={'channel_name': private_channel.name})
    resp = client.patch(url, {
        field:  b'test'
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.json() == {field: [f'Expected {field} to be a file']}


def test_patch_channel_forbidden(client, staff_jwt_header):
    """
    Update a channel's settings for a channel the user doesn't have permission to
    """
    Channel.objects.create(name='dedp2')
    url = reverse('channel-detail', kwargs={'channel_name': 'dedp2'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_patch_channel_not_found(client, staff_jwt_header):
    """
    Update a channel's settings for a missing channel
    """
    Channel.objects.create(name='missing')
    url = reverse('channel-detail', kwargs={'channel_name': 'missing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_patch_channel_nonstaff(client, jwt_header):
    """
    Fail to update a channel's settings if nonstaff user
    """
    Channel.objects.create(name='subreddit_for_testing')
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
