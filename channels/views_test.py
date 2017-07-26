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
        'author_id': user.username,
        'created': '2017-07-21T18:13:18+00:00',
        'upvoted': True,
        'id': '2x',
        'num_comments': 0,
        'score': 1,
        'channel_name': 'unit_tests',
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
        'author_id': user.username,
        'created': '2017-07-21T18:51:15+00:00',
        'upvoted': True,
        'id': '2y',
        'num_comments': 0,
        'score': 1,
        'channel_name': 'unit_tests',
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
        'author_id': None,
        'created': '2017-07-20T19:58:23+00:00',
        'upvoted': False,
        'id': post_id,
        'num_comments': 6,
        'score': 0,
        'channel_name': 'george',
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
            'score': 1,
            'author_id': user.username,
            'id': '30',
            'created': '2017-07-21T19:10:26+00:00',
            'num_comments': 0,
            'channel_name': 'two_posts',
        },
        {
            'url': 'http://micromasters.mit.edu',
            'text': None,
            'title': 'Link post',
            'upvoted': True,
            'score': 1,
            'author_id': 'george',
            'id': '2z',
            'created': '2017-07-21T19:09:37+00:00',
            'num_comments': 0,
            'channel_name': 'two_posts',
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
        'score': 1,
        'author_id': user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
        'channel_name': 'two_posts',
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
        'score': 1,
        'author_id': user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
        'channel_name': 'two_posts',
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
        'score': 1,
        'author_id': user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
        'channel_name': 'two_posts',
    }


def test_create_post_without_upvote(client, use_betamax, praw_settings):
    """Test creating a post without an upvote in the body"""
    user = UserFactory.create(username='george')
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.post(url, {
        'title': 'x',
        'text': 'y',
        'upvoted': False,
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'title': 'x',
        'text': 'y',
        'url': None,
        'author_id': user.username,
        'created': '2017-07-25T22:05:44+00:00',
        'upvoted': False,
        'id': '5',
        'num_comments': 0,
        'score': 1,
        'channel_name': 'subreddit_for_testing',
    }


def test_list_comments(client, use_betamax, praw_settings):
    """List all comments in the comment tree"""
    client.force_login(UserFactory.create(username='george'))
    url = reverse('comment-list', kwargs={'post_id': '2'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            "id": "1",
            "post_id": "2",
            "text": "hello world",
            "author_id": "george",
            "score": 1,
            "upvoted": False,
            "created": "2017-07-25T17:09:45+00:00",
            "replies": [
                {
                    "id": "2",
                    "post_id": "2",
                    "text": "texty text text",
                    "author_id": "george",
                    "score": 1,
                    "upvoted": True,
                    "created": "2017-07-25T17:15:57+00:00",
                    "replies": []
                },
                {
                    "id": "3",
                    "post_id": "2",
                    "text": "reply2",
                    "author_id": "george",
                    "score": 1,
                    "upvoted": True,
                    "created": "2017-07-25T17:16:10+00:00",
                    "replies": []
                }
            ]
        }
    ]


def test_get_comment(client, use_betamax, praw_settings):
    """View a comment's detail view"""
    client.force_login(UserFactory.create(username='george'))
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == {
        "id": "6",
        "post_id": "2",
        "text": "reply_to_comment 3",
        "author_id": "george",
        "score": 1,
        "upvoted": True,
        "created": "2017-07-25T21:18:47+00:00",
        "replies": []
    }


def test_create_comment(client, use_betamax, praw_settings):
    """Create a comment"""
    client.force_login(UserFactory.create(username='george'))
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:20:35+00:00',
        'id': '7',
        'post_id': post_id,
        'replies': [],
        'score': 1,
        'text': 'reply_to_post 2',
        'upvoted': True,
    }


def test_create_comment_no_upvote(client, use_betamax, praw_settings):
    """Create a comment without an upvote"""
    client.force_login(UserFactory.create(username='george'))
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "no upvoted",
        "upvoted": False,
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:21:48+00:00',
        'id': '9',
        'post_id': post_id,
        'replies': [],
        'score': 1,
        'text': 'no upvoted',
        'upvoted': False,
    }


def test_create_comment_reply_to_comment(client, use_betamax, praw_settings):
    """Create a comment that's a reply to another comment"""
    client.force_login(UserFactory.create(username='george'))
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_comment 3",
        "comment_id": "3",
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'post_id': post_id,
        'replies': [],
        'score': 1,
        'text': 'reply_to_comment 3',
        'upvoted': True,
    }


def test_update_comment_text(client, use_betamax, praw_settings):
    """Update a comment's text"""
    client.force_login(UserFactory.create(username='george'))
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.patch(url, type='json', data={
        "text": "updated text",
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'post_id': '2',
        'replies': [],
        'score': 1,
        'text': 'updated text',
        'upvoted': False,
    }


def test_update_comment_clear_vote(client, use_betamax, praw_settings):
    """Update a comment to clear its upvote"""
    client.force_login(UserFactory.create(username='george'))
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.patch(url, type='json', data={
        "upvoted": False,
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'post_id': '2',
        'replies': [],
        'score': 1,
        'text': 'reply_to_comment 3',
        'upvoted': False,
    }


def test_delete_comment(client, use_betamax, praw_settings):
    """Delete a comment"""
    client.force_login(UserFactory.create(username='george'))
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.delete(url)
    assert resp.status_code == 204
