"""Tests for views for REST APIs for channels"""
import pytest
from django.core.urlresolvers import reverse
from rest_framework import status

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


def test_create_channel(client, use_betamax, praw_settings, staff_jwt_header):
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
    resp = client.post(url, data=payload, **staff_jwt_header)
    assert resp.status_code == 201
    assert resp.json() == payload


def test_create_channel_nonstaff(client, praw_settings, jwt_header):
    """
    Try to create a channel with nonstaff auth and assert a failure
    """
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': 'a_channel',
        'title': 'Channel title',
        'public_description': 'public',
    }
    resp = client.post(url, data=payload, **jwt_header)
    assert resp.status_code == 403


def test_create_channel_noauth(client, praw_settings):
    """
    Try to create a channel with no auth and assert a failure
    """
    url = reverse('channel-list')
    payload = {
        'channel_type': 'private',
        'name': 'a_channel',
        'title': 'Channel title',
        'public_description': 'public',
    }
    resp = client.post(url, data=payload)
    assert resp.status_code == 401


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


def test_patch_channel(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Update a channel's settings
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json() == {
        'channel_type': 'public',
        'name': 'subreddit_for_testing',
        'title': 'subreddit for tests',
        'public_description': 'a public description goes here',
    }


def test_patch_channel_nonstaff(client, praw_settings, jwt_header):
    """
    Fail to update a channel's settings if nonstaff user
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **jwt_header)
    assert resp.status_code == 403


def test_patch_channel_noauth(client, praw_settings):
    """
    Fail to update a channel's settings if no auth
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'subreddit_for_testing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json')
    assert resp.status_code == 401


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
            "downvoted": False,
            "created": "2017-07-25T17:09:45+00:00",
            "replies": [
                {
                    "id": "2",
                    "post_id": "2",
                    "text": "texty text text",
                    "author_id": "george",
                    "score": 1,
                    "upvoted": True,
                    "downvoted": False,
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
                    "downvoted": False,
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
        "downvoted": False,
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
        "downvoted": False,
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
        "downvoted": False,
    }


def test_create_comment_downvote(client, use_betamax, praw_settings):
    """Create a comment with a downvote"""
    client.force_login(UserFactory.create(username='george'))
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "downvoted",
        "downvoted": True,
    })
    assert resp.status_code == 201
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': 'l',
        'post_id': post_id,
        'replies': [],
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': True,
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
        "downvoted": False,
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
        'downvoted': False,
    }


def test_update_comment_upvote(client, use_betamax, praw_settings):
    """Update a comment to upvote it"""
    client.force_login(UserFactory.create(username='george'))
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "upvoted": True,
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'post_id': '2',
        'replies': [],
        'score': 1,
        'text': 'downvoted',
        'upvoted': True,
        'downvoted': False,
    }


def test_update_comment_downvote(client, use_betamax, praw_settings):
    """Update a comment to downvote it"""
    client.force_login(UserFactory.create(username='george'))
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "downvoted": True,
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'post_id': '2',
        'replies': [],
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': True,
    }


def test_update_comment_clear_upvote(client, use_betamax, praw_settings):
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
        'downvoted': False,
    }


def test_update_comment_clear_downvote(client, use_betamax, praw_settings):
    """Update a comment to clear its downvote"""
    client.force_login(UserFactory.create(username='george'))
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "downvoted": False,
    })
    assert resp.status_code == 200
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'post_id': '2',
        'replies': [],
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': False,
    }


def test_delete_comment(client, use_betamax, praw_settings):
    """Delete a comment"""
    client.force_login(UserFactory.create(username='george'))
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.delete(url)
    assert resp.status_code == 204


def test_frontpage(client, use_betamax, praw_settings):
    """View the front page"""
    client.force_login(UserFactory.create(username='george'))
    url = reverse('frontpage')
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            "url": None,
            "text": "y",
            "title": "x",
            "upvoted": False,
            "score": 1,
            "author_id": "george",
            "id": "5",
            "created": "2017-07-25T22:05:44+00:00",
            "num_comments": 0,
            "channel_name": "subreddit_for_testing"
        },
        {
            "url": None,
            "text": "post for testing clear_vote",
            "title": "new post without upvote",
            "upvoted": False,
            "score": 1,
            "author_id": "george",
            "id": "3",
            "created": "2017-07-25T17:57:07+00:00",
            "num_comments": 0,
            "channel_name": "a_channel"
        },
        {
            "url": None,
            "text": "y",
            "title": "x",
            "upvoted": False,
            "score": 1,
            "author_id": "george",
            "id": "4",
            "created": "2017-07-25T22:02:40+00:00",
            "num_comments": 0,
            "channel_name": "subreddit_for_testing"
        },
        {
            "url": None,
            "text": "some text for the post",
            "title": "new post",
            "upvoted": False,
            "score": 1,
            "author_id": "george",
            "id": "2",
            "created": "2017-07-25T15:31:44+00:00",
            "num_comments": 6,
            "channel_name": "subreddit_for_testing"
        },
        {
            "url": None,
            "text": "some text for the post",
            "title": "new post",
            "upvoted": False,
            "score": 1,
            "author_id": "george",
            "id": "1",
            "created": "2017-07-25T15:07:30+00:00",
            "num_comments": 0,
            "channel_name": "subreddit_for_testing"
        }
    ]


def test_list_contributors(client, use_betamax, praw_settings):
    """
    List contributors in a channel
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    url = reverse('contributor-list', kwargs={'channel_name': 'test_channel'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{'contributor_name': 'othercontributor'}, {'contributor_name': 'fooadmin'}]


def test_list_moderators(client, use_betamax, praw_settings):
    """
    List moderators in a channel
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    url = reverse('moderator-list', kwargs={'channel_name': 'test_channel'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{'moderator_name': 'fooadmin'}]


def test_add_contributor(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Adds a contributor to a channel
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    contributor = UserFactory.create(username='othercontributor')
    url = reverse('contributor-list', kwargs={'channel_name': 'test_channel'})
    resp = client.post(url, data={'contributor_name': contributor.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'contributor_name': 'othercontributor'}


def test_detail_contributor_error(client, use_betamax, praw_settings):
    """
    Detail of a contributor in a channel in case the user is not a contributor
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    nocontributor = UserFactory.create(username='nocontributor')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': nocontributor.username})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_detail_contributor(client, use_betamax, praw_settings):
    """
    Detail of a contributor in a channel
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    contributor = UserFactory.create(username='othercontributor')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': contributor.username})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {'contributor_name': 'othercontributor'}


def test_remove_contributor(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Removes a contributor from a channel
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    contributor = UserFactory.create(username='othercontributor')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_contributor_moderator(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Removes a contributor from a channel but fails because the contributor is a moderator
    """
    client.force_login(UserFactory.create(username='fooadmin'))
    contributor = UserFactory.create(username='othercontributor')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_409_CONFLICT
