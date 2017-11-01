"""Tests for views for REST APIs for channels"""
# pylint: disable=too-many-lines
import pytest
from django.core.urlresolvers import reverse
from praw.exceptions import APIException
from rest_framework import status

from channels.api import Api
from channels.factories import RedditFactories
from channels.serializers import default_profile_image
from open_discussions.factories import UserFactory
from profiles.factories import ProfileFactory

# pylint: disable=redefined-outer-name, unused-argument, too-many-lines
pytestmark = pytest.mark.django_db


@pytest.fixture()
def reddit_factories(request, cassette_exists, staff_user):
    """RedditFactories fixture"""
    name = "{}.{}".format(request.module.__name__, request.function.__name__)
    ctx = RedditFactories(name, api=Api(staff_user))
    if cassette_exists:
        ctx.load()
    yield ctx
    if not cassette_exists:
        ctx.write()


# pylint: disable=too-many-lines
def test_list_channels(client, use_betamax, praw_settings, staff_jwt_header, reddit_factories):
    """
    List channels the user is subscribed to
    """
    channel = reddit_factories.channel('one')
    url = reverse('channel-list')
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'title': channel.title,
            'name': channel.name,
            'public_description': channel.public_description,
            'channel_type': channel.channel_type,
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


def test_create_channel_already_exists(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Create a channel which already exists
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
    assert resp.status_code == status.HTTP_409_CONFLICT


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


def test_get_channel(
        client, use_betamax, praw_settings, staff_user, staff_jwt_header, reddit_factories
):  # pylint: disable=too-many-arguments
    """
    Get a channel
    """
    channel = reddit_factories.channel('one')
    url = reverse('channel-detail', kwargs={'channel_name': channel.name})
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'channel_type': channel.channel_type,
        'name': channel.name,
        'title': channel.title,
        'public_description': channel.public_description,
    }


def test_get_channel_forbidden(client, use_betamax, praw_settings):
    """
    If PRAW returns a 403 error we should also return a 403 error
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'xavier2'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_channel_not_found(client, use_betamax, praw_settings):
    """
    If PRAW returns a 404 error we should also return a 404 error
    """
    client.force_login(UserFactory.create())
    url = reverse('channel-detail', kwargs={'channel_name': 'not_a_real_channel_name'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


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


def test_patch_channel_forbidden(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Update a channel's settings for a channel the user doesn't have permission to
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'dedp2'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_patch_channel_not_found(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Update a channel's settings for a missing channel
    """
    url = reverse('channel-detail', kwargs={'channel_name': 'missing'})
    resp = client.patch(url, {
        'channel_type': 'public',
    }, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


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


def test_create_url_post(client, logged_in_profile, use_betamax, praw_settings):
    """
    Create a new url post
    """
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
        'author_id': logged_in_profile.user.username,
        'created': '2017-07-21T18:13:18+00:00',
        'upvoted': True,
        'id': '2x',
        'num_comments': 0,
        'score': 1,
        'channel_name': 'unit_tests',
        "profile_image": logged_in_profile.image_small,
        "author_name": logged_in_profile.name,
    }


def test_create_text_post(client, logged_in_profile, use_betamax, praw_settings):
    """
    Create a new text post
    """
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
        'author_id': logged_in_profile.user.username,
        'created': '2017-07-21T18:51:15+00:00',
        'upvoted': True,
        'id': '2y',
        'num_comments': 0,
        'score': 1,
        'channel_name': 'unit_tests',
        'profile_image': logged_in_profile.image_small,
        "author_name": logged_in_profile.name,
    }


def test_create_post_forbidden(client, logged_in_profile, use_betamax, praw_settings):
    """
    Create a new text post for a channel the user doesn't have permission to
    """
    url = reverse('post-list', kwargs={'channel_name': 'my_channel2'})
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_post_not_found(client, logged_in_profile, use_betamax, praw_settings):
    """
    Create a new text post for a channel that doesn't exist
    """
    url = reverse('post-list', kwargs={'channel_name': 'doesnt_exist'})
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize("missing_user", [True, False])
def test_get_deleted_post(client, logged_in_profile, use_betamax, praw_settings, missing_user):
    """Get an existing post"""
    if missing_user:
        logged_in_profile.user.username = 'renamed'
        logged_in_profile.user.save()

    post_id = '29'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


# pylint: disable=too-many-arguments
@pytest.mark.parametrize("missing_user,missing_image", [
    [True, True],
    [True, False],
    [False, True],
    [False, False],
])
def test_get_post(client, logged_in_profile, use_betamax, praw_settings, missing_user, missing_image):
    """Get an existing post with no image"""
    profile_image = default_profile_image
    if not missing_user:
        profile = ProfileFactory(user__username='alice')
        if missing_image:
            profile.image_small = None
            profile.save()
        else:
            profile_image = profile.image_small
    else:
        profile = None

    post_id = 'b'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    if missing_user:
        assert resp.status_code == status.HTTP_404_NOT_FOUND
    else:
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            'title': 'fasdf',
            'text': 'fff',
            'url': None,
            'author_id': profile.user.username,
            'created': '2017-09-07T14:47:34+00:00',
            'upvoted': True,
            'id': post_id,
            'num_comments': 2,
            'score': 1,
            'channel_name': 'macromasters',
            'profile_image': profile_image,
            "author_name": profile.name,
        }


def test_get_post_forbidden(client, logged_in_profile, use_betamax, praw_settings):
    """Get a post the user doesn't have permission to"""
    post_id = 'adc'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_post_not_found(client, logged_in_profile, use_betamax, praw_settings):
    """Get a post the user doesn't have permission to"""
    post_id = 'missing'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_posts(client, logged_in_profile, use_betamax, praw_settings, missing_user):
    """List posts in a channel"""
    if missing_user:
        logged_in_profile.user.username = 'renamed'
        logged_in_profile.user.save()
        profile_image = default_profile_image
        name = "[deleted]"
    else:
        profile_image = logged_in_profile.image_small
        name = logged_in_profile.name

    url = reverse('post-list', kwargs={'channel_name': 'two_posts'})
    resp = client.get(url)
    assert resp.status_code == 200

    if missing_user:
        # all posts should be filtered out
        assert resp.json() == {
            'posts': [],
            'pagination': {}
        }
    else:
        assert resp.json() == {
            'posts': [
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
                    'author_id': "george",
                    'id': '30',
                    'created': '2017-07-21T19:10:26+00:00',
                    'num_comments': 0,
                    'channel_name': 'two_posts',
                    "profile_image": profile_image,
                    "author_name": name
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
                    "profile_image": profile_image,
                    "author_name": name
                }
            ],
            'pagination': {}
        }


def test_list_posts_forbidden(client, logged_in_profile, use_betamax, praw_settings):
    """List posts in a channel the user doesn't have access to"""
    url = reverse('post-list', kwargs={'channel_name': 'my_channel2'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_posts_not_found(client, logged_in_profile, use_betamax, praw_settings):
    """List posts in a channel the user doesn't have access to"""
    url = reverse('post-list', kwargs={'channel_name': 'missing'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize('params,expected', [
    ({}, {'after': 't3_q', 'after_count': 5}),
    ({'after': 't3_q', 'count': '5'}, {'after': 't3_l', 'after_count': 10, 'before': 't3_p', 'before_count': 6}),
    ({'after': 't3_s', 'count': '3'}, {'after': 't3_n', 'after_count': 8, 'before': 't3_r', 'before_count': 4}),
    ({'before': 't3_r', 'count': '6'}, {'after': 't3_s', 'after_count': 5}),
])
def test_list_posts_pagination(client, logged_in_profile, use_betamax, praw_settings, settings, params, expected):
    """Test that post pagination works"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    url = reverse('post-list', kwargs={'channel_name': 'ten_posts'})
    resp = client.get(url, params)
    assert resp.status_code == 200
    assert resp.json()['pagination'] == expected


def test_update_post_text(client, logged_in_profile, use_betamax, praw_settings):
    """Test updating just the text of a post"""
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
        'author_id': logged_in_profile.user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
        'channel_name': 'two_posts',
        "profile_image": logged_in_profile.image_small,
        "author_name": logged_in_profile.name,
    }


def test_update_post_clear_vote(client, logged_in_profile, use_betamax, praw_settings):
    """Test updating a post to clear the user's vote"""
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
        'author_id': logged_in_profile.user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
        'channel_name': 'two_posts',
        "profile_image": logged_in_profile.image_small,
        "author_name": logged_in_profile.name,
    }


def test_update_post_upvote(client, logged_in_profile, use_betamax, praw_settings):
    """Test updating a post to upvote it"""
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
        'author_id': logged_in_profile.user.username,
        'id': post_id,
        'created': '2017-07-21T19:10:26+00:00',
        'num_comments': 0,
        'channel_name': 'two_posts',
        "profile_image": logged_in_profile.image_small,
        "author_name": logged_in_profile.name,
    }


def test_update_post_forbidden(client, logged_in_profile, use_betamax, praw_settings):
    """Test updating a post the user isn't the owner of"""
    post_id = 'acd'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"text": "overwrite"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_not_found(client, logged_in_profile, use_betamax, praw_settings):
    """Test updating a post that doesn't exist"""
    post_id = 'missing'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"text": "overwrite"})
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_create_post_without_upvote(client, logged_in_profile, use_betamax, praw_settings):
    """Test creating a post without an upvote in the body"""
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
        'author_id': logged_in_profile.user.username,
        'created': '2017-07-25T22:05:44+00:00',
        'upvoted': False,
        'id': '5',
        'num_comments': 0,
        'score': 1,
        'channel_name': 'subreddit_for_testing',
        "profile_image": logged_in_profile.image_small,
        "author_name": logged_in_profile.name
    }


# Reddit doesn't indicate if a post deletion failed so we don't have tests for that
def test_delete_post(client, logged_in_profile, use_betamax, praw_settings):
    """Delete a post in a channel"""
    url = reverse('post-detail', kwargs={'post_id': '2'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_comments(client, logged_in_profile, use_betamax, praw_settings, missing_user):
    """List all comments in the comment tree"""
    if missing_user:
        logged_in_profile.user.username = 'renamed'
        logged_in_profile.user.save()
        profile_image = default_profile_image
        name = "[deleted]"
        author_id = '[deleted]'
    else:
        profile_image = logged_in_profile.image_small
        author_id = logged_in_profile.user.username
        name = logged_in_profile.name

    url = reverse('comment-list', kwargs={'post_id': '2'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            "id": "1",
            "post_id": "2",
            "text": "hello world",
            "author_id": author_id,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "created": "2017-07-25T17:09:45+00:00",
            'profile_image': profile_image,
            'author_name': name,
            "replies": [
                {
                    "id": "2",
                    "post_id": "2",
                    "text": "texty text text",
                    "author_id": author_id,
                    "score": 1,
                    "upvoted": True,
                    "downvoted": False,
                    "created": "2017-07-25T17:15:57+00:00",
                    "replies": [],
                    'profile_image': profile_image,
                    'author_name': name,
                },
                {
                    "id": "3",
                    "post_id": "2",
                    "text": "reply2",
                    "author_id": author_id,
                    "score": 1,
                    "upvoted": True,
                    "downvoted": False,
                    "created": "2017-07-25T17:16:10+00:00",
                    "replies": [],
                    'profile_image': profile_image,
                    'author_name': name,
                }
            ]
        }
    ]


def test_list_comments_forbidden(client, logged_in_profile, use_betamax, praw_settings):
    """List all comments in the comment tree for a post the user doesn't have access to"""
    url = reverse('comment-list', kwargs={'post_id': 'adc'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_comments_not_found(client, logged_in_profile, use_betamax, praw_settings):
    """List all comments in the comment tree for a post that doesn't exist"""
    url = reverse('comment-list', kwargs={'post_id': 'missing'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_list_deleted_comments(client, logged_in_profile, use_betamax, praw_settings):
    """List comments which are deleted according to reddit"""
    user = ProfileFactory.create(user__username='admin').user

    url = reverse('comment-list', kwargs={'post_id': 'p'})
    resp = client.get(url)
    assert resp.status_code == 200
    assert resp.json() == [
        {
            'author_id': '[deleted]',
            'created': '2017-09-27T16:03:42+00:00',
            'downvoted': False,
            'post_id': 'p',
            'profile_image': default_profile_image,
            'replies': [{
                'author_id': user.username,
                'created': '2017-09-27T16:03:51+00:00',
                'downvoted': False,
                'id': '1t',
                'post_id': 'p',
                'profile_image': user.profile.image_small,
                'replies': [],
                'score': 1,
                'text': 'reply to parent which is not deleted',
                'upvoted': False,
                "author_name": user.profile.name
            }],
            'score': 1,
            'text': '[deleted]',
            'upvoted': False,
            'id': '1s',
            "author_name": "[deleted]"
        }]


def test_create_comment(client, logged_in_profile, use_betamax, praw_settings):
    """Create a comment"""
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_201_CREATED
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


def test_create_comment_forbidden(client, logged_in_profile, use_betamax, praw_settings):
    """Create a comment for a post the user doesn't have access to"""
    post_id = 'adc'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_not_found(client, logged_in_profile, use_betamax, praw_settings):
    """Create a comment for a post that doesn't exist"""
    post_id = 'missing'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_no_upvote(client, logged_in_profile, use_betamax, praw_settings):
    """Create a comment without an upvote"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


def test_create_comment_downvote(client, logged_in_profile, use_betamax, praw_settings):
    """Create a comment with a downvote"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


def test_create_comment_reply_to_comment(client, logged_in_profile, use_betamax, praw_settings):
    """Create a comment that's a reply to another comment"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


def test_update_comment_text(client, logged_in_profile, use_betamax, praw_settings):
    """Update a comment's text"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


# Reddit returns the same result for updating a missing comment
# as it does for updating a comment the user doesn't own.
def test_update_comment_forbidden(client, logged_in_profile, use_betamax, praw_settings):
    """Update a comment's text for a comment the user doesn't own"""
    url = reverse('comment-detail', kwargs={'comment_id': 'e8h'})
    resp = client.patch(url, type='json', data={
        "text": "updated text",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_comment_upvote(client, logged_in_profile, use_betamax, praw_settings):
    """Update a comment to upvote it"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


def test_update_comment_downvote(client, logged_in_profile, use_betamax, praw_settings):
    """Update a comment to downvote it"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


def test_update_comment_clear_upvote(client, logged_in_profile, use_betamax, praw_settings):
    """Update a comment to clear its upvote"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


def test_update_comment_clear_downvote(client, logged_in_profile, use_betamax, praw_settings):
    """Update a comment to clear its downvote"""
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
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
    }


# Reddit doesn't indicate if a comment deletion failed so we don't have tests that
def test_delete_comment(client, logged_in_profile, use_betamax, praw_settings):
    """Delete a comment"""
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("missing_user", [True, False])
def test_frontpage(client, logged_in_profile, use_betamax, praw_settings, missing_user):
    """View the front page"""
    if missing_user:
        logged_in_profile.user.username = 'renamed'
        logged_in_profile.user.save()

    url = reverse('frontpage')
    resp = client.get(url)
    assert resp.status_code == 200
    if missing_user:
        assert resp.json() == {
            'posts': [],
            'pagination': {},
        }
    else:
        assert resp.json() == {
            'posts': [
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
                    "channel_name": "subreddit_for_testing",
                    'author_name': logged_in_profile.name,
                    "profile_image": logged_in_profile.image_small
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
                    "channel_name": "a_channel",
                    'author_name': logged_in_profile.name,
                    "profile_image": logged_in_profile.image_small
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
                    "channel_name": "subreddit_for_testing",
                    'author_name': logged_in_profile.name,
                    "profile_image": logged_in_profile.image_small
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
                    "channel_name": "subreddit_for_testing",
                    'author_name': logged_in_profile.name,
                    "profile_image": logged_in_profile.image_small
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
                    "channel_name": "subreddit_for_testing",
                    'author_name': logged_in_profile.name,
                    "profile_image": logged_in_profile.image_small
                }
            ],
            'pagination': {},
        }


@pytest.mark.parametrize('params,expected', [
    ({}, {'after': 't3_3', 'after_count': 5}),
    ({'after': 't3_3', 'count': '5'}, {'after': 't3_7', 'after_count': 10, 'before': 't3_e', 'before_count': 6}),
    ({'after': 't3_a', 'count': '3'}, {'after': 't3_b', 'after_count': 8, 'before': 't3_9', 'before_count': 4}),
    ({'before': 't3_e', 'count': '6'}, {'after': 't3_3', 'after_count': 5}),
])
def test_frontpage_pagination(client, logged_in_profile, use_betamax, praw_settings, settings, params, expected):
    """Test that post pagination works"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    url = reverse('frontpage')
    resp = client.get(url, params)
    assert resp.status_code == 200
    assert resp.json()['pagination'] == expected


def test_list_contributors(client, logged_in_profile, use_betamax, praw_settings):
    """
    List contributors in a channel
    """
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


def test_list_subscribers_not_allowed(client, staff_jwt_header):
    """
    Get method not allowed on the list of subscribers
    """
    url = reverse('subscriber-list', kwargs={'channel_name': 'test_channel'})
    assert client.get(url, **staff_jwt_header).status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_add_contributor(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Adds a contributor to a channel
    """
    contributor = ProfileFactory.create(user__username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': contributor.user.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'contributor_name': contributor.user.username}


def test_add_contributor_again(client, use_betamax, praw_settings, staff_jwt_header):
    """
    If the user is already a contributor a 201 status should be returned
    """
    contributor = ProfileFactory.create(user__username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': contributor.user.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'contributor_name': contributor.user.username}


def test_add_moderator(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Adds a moderator to a channel
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('moderator-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'moderator_name': moderator.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'moderator_name': moderator.username}


def test_add_moderator_again(client, use_betamax, praw_settings, staff_jwt_header):
    """
    If a user is already a moderator we should return 201 without making any changes
    """
    moderator = UserFactory.create(username='already_mod')
    url = reverse('moderator-list', kwargs={'channel_name': 'a_channel'})
    resp = client.post(url, data={'moderator_name': moderator.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'moderator_name': moderator.username}


def test_add_subscriber(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Adds a subscriber to a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_add_subscriber_again(client, use_betamax, praw_settings, staff_jwt_header):
    """
    If a user is already part of a channel we should return a 201 status
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_add_subscriber_forbidden(client, use_betamax, praw_settings, staff_jwt_header):
    """
    If a user gets a 403 from praw we should return a 403 status
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_detail_contributor_error(client, use_betamax, praw_settings):
    """
    Detail of a contributor in a channel in case the user is not a contributor
    """
    admin = ProfileFactory.create(user__username='fooadmin')
    client.force_login(admin.user)
    nocontributor = ProfileFactory.create()
    nocontributor.user.username = 'nocontributor'
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': nocontributor.user.username})
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


def test_detail_subscriber(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Detail of a subscriber in a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_detail_subscriber_missing(client, use_betamax, praw_settings):
    """
    A missing subscriber should generate a 404
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    client.force_login(subscriber)
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username}
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_remove_contributor(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Removes a contributor from a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'admin_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_contributor_again(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Removes a contributor from a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'admin_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_moderator(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Removes a moderator from a channel
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_moderator_again(client, use_betamax, praw_settings, staff_jwt_header):
    """
    If a user is already not a moderator for a channel we should still return a 204
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_subscriber(client, use_betamax, praw_settings, staff_jwt_header):
    """
    Removes a subscriber from a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_subscriber_again(client, use_betamax, praw_settings, staff_jwt_header):
    """
    The API should return a 204 even if the user isn't there
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_api_exception(client, logged_in_profile, use_betamax, praw_settings, mocker):
    """Make sure APIExceptions which aren't recognized become 500 errors"""
    exception = APIException('bizarre', 'A bizarre exception', 'bizarre_field')
    mocker.patch(
        'channels.serializers.CommentSerializer.update',
        side_effect=exception
    )
    url = reverse('comment-detail', kwargs={'comment_id': 'e8h'})
    with pytest.raises(APIException) as ex:
        client.patch(url, type='json', data={
            "text": "updated text",
        })
    assert ex.value == exception
