"""Tests for views for REST APIs for channels"""
from django.core.urlresolvers import reverse
import pytest

from open_discussions.factories import UserFactory


# pylint: disable=redefined-outer-name, unused-argument
pytestmark = pytest.mark.django_db


def test_list_channels(client, use_betamax, praw_settings):
    """
    List channels the user is subscribed to
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-list')
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'title': 'subreddit for tests',
            'name': 'subreddit_for_testing',
            'public_description': 'a public description goes here',
            'channel_type': 'private',
        }
    ]


def test_create_channel(client, use_betamax, praw_settings):
    """
    Create a channel and assert the response
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': 'a_channel',
        'title': 'Channel title',
        'public_description': 'public',
    }
    resp = client.post(url, data=payload)
    assert resp.status_code == 201
    assert resp.json() == payload


def test_get_channel(client, use_betamax, praw_settings):
    """
    Get a channel
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == {
        'channel_type': 'private',
        'name': 'subreddit_for_testing',
        'title': 'subreddit for tests',
        'public_description': 'a public description goes here',
    }


def test_patch_channel(client, use_betamax, praw_settings):
    """
    Update a channel's settings
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json')
    assert resp.status_code == 200
    assert resp.json() == {
        'channel_type': 'public',
        'name': 'subreddit_for_testing',
        'title': 'subreddit for tests',
        'public_description': 'a public description goes here',
    }


def test_create_url_post(client, use_betamax, praw_settings):
    """
    Create a new url post
    """
    user = UserFactory.create(username='george')
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': 'unit_tests'})
    resp = client.post(url, {
        'title': 'url title 🐨',
        'url': 'http://micromasters.mit.edu/🐨',
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'title': 'url title 🐨',
        'url': 'http://micromasters.mit.edu/🐨',
        'text': None,
        'author': user.username,
        'created': '2017-07-21T18:13:18+00:00',
        'upvoted': True,
        'downvoted': False,
        'id': '2x',
        'num_comments': 0,
        'score': 1,
    }


def test_create_text_post(client, use_betamax, praw_settings):
    """
    Create a new text post
    """
    user = UserFactory.create(username='george')
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': 'unit_tests'})
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'title': 'parameterized testing',
        'text': 'tests are great',
        'url': None,
        'author': user.username,
        'created': '2017-07-21T18:51:15+00:00',
        'upvoted': True,
        'downvoted': False,
        'id': '2y',
        'num_comments': 0,
        'score': 1,
    }


def test_get_post(client, use_betamax, praw_settings):
    """Get an existing post"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    post_id = '29'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == {
        'title': 'post 3',
        'text': '[deleted]',
        'url': None,
        'author': None,
        'created': '2017-07-20T19:58:23+00:00',
        'upvoted': False,
        'downvoted': False,
        'id': post_id,
        'num_comments': 6,
        'score': 0,
    }


def test_list_posts(client, use_betamax, praw_settings):
    """List posts in a channel"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': 'two_posts'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'url': None,
            'text': '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙊 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 '
                    '🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐚 🐞 🐜 🕷 🕸 🐢 🐍 🦎 🦂 🦀 🦑 🐙 🦐 '
                    '🐠 🐟 🐡 🐬 🦈 🐳 🐋 🐊 🐆 🐅 🐃 🐂 🐄 🦌 🐪 🐫 🐘 🦏 🦍 🐎 🐖 🐐 🐏 🐑 🐕 '
                    '🐩 🐈 🐓 🦃 🕊 🐇 🐁 🐀 🐿 🐾 🐉 🐲 🌵 🎄 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🎍 🎋 🍃 🍂 🍁 '
                    '🍄 🌾 💐 🌷 🌹 🥀 🌻 🌼 🌸 🌺 🌎 🌍 🌏 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌚 🌝 🌞 🌛 '
                    '🌜 🌙 💫 ⭐️ 🌟 ✨ ⚡️ 🔥 💥 ☄️ ☀️ 🌤 ⛅️ 🌥 🌦 🌈 ☁️ 🌧 ⛈ 🌩 🌨 ☃️ ⛄️ '
                    '❄️ 🌬 💨 🌪 🌫 🌊 💧 💦 ☔️',
            'title': 'Text post',
            'upvoted': True,
            'downvoted': False,
            'score': 1,
            'author': user.username,
            'id': '30',
            'created': '2017-07-21T19:10:26+00:00',
            'num_comments': 0,
        },
        {
            'url': 'http://micromasters.mit.edu',
            'text': None,
            'title': 'Link post',
            'upvoted': True,
            'downvoted': False,
            'score': 1,
            'author': 'george',
            'id': '2z',
            'created': '2017-07-21T19:09:37+00:00',
            'num_comments': 0,
        }
    ]


def test_update_post_text(client, use_betamax, praw_settings):
    """Test updating just the text of a post"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    post_id = '30'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"text": "overwrite"})
    assert resp.status_code == 200
    assert resp.json() == {
        'url': None,
        'text': 'overwrite',
        'title': 'Text post',
        'upvoted': False,
        'downvoted': False,
        'score': 1,
        'author': user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
    }


def test_update_post_clear_vote(client, use_betamax, praw_settings):
    """Test updating a post to clear the user's vote"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    post_id = '30'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"upvoted": False})
    assert resp.status_code == 200
    assert resp.json() == {
        'url': None,
        'text': 'overwrite',
        'title': 'Text post',
        'upvoted': False,
        'downvoted': False,
        'score': 1,
        'author': user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
    }


def test_update_post_downvote(client, use_betamax, praw_settings):
    """Test updating a post to downvote it"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    post_id = '30'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"downvoted": True})
    assert resp.status_code == 200
    assert resp.json() == {
        'url': None,
        'text': 'overwrite',
        'title': 'Text post',
        'upvoted': False,
        'downvoted': True,
        'score': 1,
        'author': user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
    }


def test_update_post_upvote(client, use_betamax, praw_settings):
    """Test updating a post to upvote it"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    post_id = '30'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"upvoted": True})
    assert resp.status_code == 200
    assert resp.json() == {
        'url': None,
        'text': 'overwrite',
        'title': 'Text post',
        'upvoted': True,
        'downvoted': False,
        'score': 1,
        'author': user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
    }


def test_create_downvote(client, use_betamax, praw_settings):
    """Test creating a post with a downvote in the body"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.post(url, {
        'title': 'new post',
        'text': 'some text for the post',
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'title': 'new post',
        'text': 'some text for the post',
        'url': None,
        'author': user.username,
        'created': '2017-07-25T15:31:44+00:00',
        'upvoted': False,
        'downvoted': True,
        'id': '2',
        'num_comments': 0,
        'score': 1,
    }
