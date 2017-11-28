"""Tests for views for REST APIs for channels"""
# pylint: disable=too-many-lines
from itertools import product

import pytest
from betamax.fixtures.pytest import _casette_name
from django.core.urlresolvers import reverse
from praw.exceptions import APIException
from rest_framework import status

from channels.api import Api, CHANNEL_TYPE_PRIVATE
from channels.factories import RedditFactories, FactoryStore, STRATEGY_BUILD
from channels.serializers import default_profile_image
from channels.test_constants import LIST_MORE_COMMENTS_RESPONSE
from open_discussions.factories import UserFactory

# pylint: disable=redefined-outer-name, unused-argument, too-many-lines
pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures("use_betamax", "praw_settings"),
]


@pytest.fixture()
def reddit_factories(request, cassette_exists):
    """RedditFactories fixture"""
    # use betamax's _casette_name to determine filename
    store = FactoryStore(_casette_name(request, parametrized=True))
    ctx = RedditFactories(store)
    if cassette_exists:
        store.load()
    yield ctx
    if not cassette_exists:
        store.write()


@pytest.fixture()
def user(db, reddit_factories):
    """Override the user fixture to use reddit_factories"""
    return reddit_factories.user("contributor")


@pytest.fixture()
def staff_user(db, reddit_factories):
    """Override the staff_user fixture to use reddit_factories"""
    return reddit_factories.user("staff_user")


@pytest.fixture()
def private_channel(reddit_factories, staff_user):
    """Returns a standard channel for tests"""
    return reddit_factories.channel("private_channel", staff_user, channel_type=CHANNEL_TYPE_PRIVATE)


@pytest.fixture()
def staff_api(staff_user):
    """A fixture for an Api instance configured with the staff user"""
    return Api(staff_user)


@pytest.fixture()
def private_channel_and_contributor(private_channel, staff_api, user):
    """Fixture for a channel and a user who is a contributor"""
    staff_api.add_contributor(user.username, private_channel.name)
    staff_api.add_subscriber(user.username, private_channel.name)
    return (private_channel, user)


# pylint: disable=too-many-lines
def test_list_channels(client, jwt_header, private_channel_and_contributor):
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


def test_create_url_post(client, private_channel_and_contributor):
    """
    Create a new url post
    """
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'url title 🐨',
        'url': 'http://micromasters.mit.edu/🐨',
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'title': 'url title 🐨',
        'url': 'http://micromasters.mit.edu/🐨',
        'text': None,
        'author_id': user.username,
        'created': '2017-11-22T17:19:35+00:00',
        'upvoted': True,
        'id': 'e6',
        'num_comments': 0,
        'removed': False,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
    }


def test_create_text_post(client, private_channel_and_contributor):
    """
    Create a new text post
    """
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'title': 'parameterized testing',
        'text': 'tests are great',
        'url': None,
        'author_id': user.username,
        'created': '2017-11-22T17:29:51+00:00',
        'upvoted': True,
        'removed': False,
        'id': 'e7',
        'num_comments': 0,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        'profile_image': user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
    }


def test_create_post_forbidden(client, private_channel, jwt_header):
    """
    Create a new text post for a channel the user doesn't have permission to
    """
    url = reverse('post-list', kwargs={'channel_name': private_channel.name})
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    }, **jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_post_not_found(client, logged_in_profile):
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
def test_get_deleted_post(client, missing_user, staff_jwt_header, private_channel_and_contributor, reddit_factories):
    """Get an existing post for a deleted user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("deleted", user, channel=channel)

    if missing_user:
        user.username = 'renamed'
        user.save()

    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.get(url, **staff_jwt_header)
    if missing_user:
        assert resp.status_code == status.HTTP_404_NOT_FOUND
    else:
        assert resp.status_code == status.HTTP_200_OK


# pylint: disable=too-many-arguments
@pytest.mark.parametrize("missing_image", [True, False])
def test_get_post(client, private_channel_and_contributor, reddit_factories, missing_image):
    """Get an existing post with no image"""
    channel, user = private_channel_and_contributor

    if missing_image:
        user.profile.image_small = None
    else:
        user.profile.image_small = '/just/a/great/image.png.jpg.gif'
    user.profile.save()

    profile_image = default_profile_image if missing_image else user.profile.image_small

    post = reddit_factories.text_post('my geat post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "url": None,
        "text": post.text,
        "title": post.title,
        "upvoted": True,
        'removed': False,
        "score": 1,
        "author_id": user.username,
        "id": post.id,
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "profile_image": profile_image,
        'edited': False,
        "stickied": False,
    }


def test_get_post_forbidden(client, logged_in_profile):
    """Get a post the user doesn't have permission to"""
    post_id = 'adc'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_get_post_not_found(client, logged_in_profile):
    """Get a post the user doesn't have permission to"""
    post_id = 'missing'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_get_post_stickied(client, private_channel_and_contributor, reddit_factories, staff_api):
    """test that stickied posts come back that way"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    staff_api.pin_post(post.id, True)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    get_resp = client.get(url)
    assert get_resp.status_code == status.HTTP_200_OK
    assert get_resp.json() == {
        "url": None,
        "text": post.text,
        "title": post.title,
        "upvoted": True,
        'removed': False,
        "score": 1,
        "author_id": user.username,
        "id": post.id,
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "profile_image": user.profile.image_small,
        "edited": False,
        "stickied": True,
    }


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_posts(client, missing_user, private_channel_and_contributor, reddit_factories):
    """List posts in a channel"""
    channel, user = private_channel_and_contributor
    posts = list(reversed([
        reddit_factories.link_post("link_post", user=user, channel=channel),
        reddit_factories.text_post("text_post", user=user, channel=channel),
    ]))

    if missing_user:
        user.username = 'renamed'
        user.save()

    client.force_login(user)

    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK

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
                    "url": post.url,
                    "text": post.text,
                    "title": post.title,
                    "upvoted": True,
                    "removed": False,
                    "score": 1,
                    "author_id": user.username,
                    "id": post.id,
                    "created": post.created,
                    "num_comments": 0,
                    "channel_name": channel.name,
                    "channel_title": channel.title,
                    'author_name': user.profile.name,
                    "profile_image": user.profile.image_small,
                    "edited": False,
                    "stickied": False,
                } for post in posts
            ],
            'pagination': {}
        }


def test_list_posts_stickied(client, private_channel_and_contributor, reddit_factories, staff_api):
    """test that the stickied post is first"""
    channel, user = private_channel_and_contributor
    posts = [
        reddit_factories.text_post("great post!{}".format(i), user, channel=channel)
        for i in range(4)
    ]
    staff_api.pin_post(posts[2].id, True)
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["posts"][0] == {
        "url": posts[2].url,
        "text": posts[2].text,
        "title": posts[2].title,
        "upvoted": True,
        "removed": False,
        "score": 1,
        "author_id": user.username,
        "id": posts[2].id,
        "created": posts[2].created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "profile_image": user.profile.image_small,
        "edited": False,
        "stickied": True
    }


def test_list_posts_forbidden(client, logged_in_profile):
    """List posts in a channel the user doesn't have access to"""
    url = reverse('post-list', kwargs={'channel_name': 'my_channel2'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_posts_not_found(client, logged_in_profile):
    """List posts in a channel the user doesn't have access to"""
    url = reverse('post-list', kwargs={'channel_name': 'missing'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_list_posts_pagination_first_page_no_params(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for the first page if no params"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {}
    expected = {'after': 't3_{}'.format(posts[4].id), 'after_count': 5}
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_first_page_with_params(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for the first page with params"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {'before': 't3_{}'.format(posts[5].id), 'count': 6}
    expected = {'after': 't3_{}'.format(posts[4].id), 'after_count': 5}
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_non_first_page(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for a page that's not the first one"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {'after': 't3_{}'.format(posts[4].id), 'count': 5}
    expected = {
        'before': 't3_{}'.format(posts[5].id),
        'before_count': 6,
        'after': 't3_{}'.format(posts[9].id),
        'after_count': 10
    }
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_non_offset_page(
        client, settings, private_channel_and_contributor, reddit_factories, jwt_header
):
    """Test that post pagination works for a page that doesn't align to the number of results"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    channel, user = private_channel_and_contributor
    posts = list(reversed([reddit_factories.text_post(idx, user=user, channel=channel) for idx in range(15)]))
    params = {'after': 't3_{}'.format(posts[5].id), 'count': 5}
    expected = {
        'before': 't3_{}'.format(posts[6].id),
        'before_count': 6,
        'after': 't3_{}'.format(posts[10].id),
        'after_count': 10
    }
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_update_post_text(client, private_channel_and_contributor, reddit_factories):
    """Test updating just the text of a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"text": "overwrite"})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': 'overwrite',
        'title': post.title,
        'upvoted': True,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
    }


def test_update_post_stickied(client, private_channel_and_contributor, reddit_factories, staff_user):
    """Test updating just the stickied boolean on a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    client.force_login(staff_user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"stickied": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": True,
    }


def test_update_post_unsticky(client, private_channel_and_contributor, reddit_factories, staff_api, staff_user):
    """Test updating just the stickied boolean on a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    staff_api.pin_post(post.id, True)
    client.force_login(staff_user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"stickied": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['stickied'] is False


def test_update_post_nonmoderator_cant_sticky(client, private_channel_and_contributor, reddit_factories):
    """Test that a normal user cant sticky posts"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"stickied": True})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_clear_vote(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to clear the user's vote"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("just a post", user, channel=channel)
    client.force_login(user)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"upvoted": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
    }


def test_update_post_upvote(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to upvote it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.patch(url, format='json', data={"upvoted": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': True,
        'removed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        "edited": False,
        "stickied": False,
    }


def test_update_post_removed(client, staff_user, private_channel_and_contributor, reddit_factories):
    """Test updating a post to remove it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(staff_user)
    resp = client.patch(url, format='json', data={"removed": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': True,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        "edited": False,
        "stickied": False,
    }


def test_update_post_clear_removed(client, staff_user, staff_api, private_channel_and_contributor, reddit_factories):
    """Test updating a post to re-approve it"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    staff_api.remove_post(post.id)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(staff_user)
    resp = client.patch(url, format='json', data={"removed": False})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': False,
        'author_id': user.username,
        'id': post.id,
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
    }


def test_update_post_removed_forbidden(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to remove with a nonstaff user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.patch(url, format='json', data={"removed": True})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_forbidden(client, staff_jwt_header, private_channel_and_contributor, reddit_factories):
    """Test updating a post the user isn't the owner of"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("text", user=user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.patch(url, format='json', data={"text": "overwrite"}, **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_post_not_found(client, jwt_header):
    """Test updating a post that doesn't exist"""
    post_id = 'missing'
    url = reverse('post-detail', kwargs={'post_id': post_id})
    resp = client.patch(url, format='json', data={"text": "overwrite"}, **jwt_header)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_create_post_without_upvote(client, private_channel_and_contributor):
    """Test creating a post without an upvote in the body"""
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'x',
        'text': 'y',
        'upvoted': False,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'title': 'x',
        'text': 'y',
        'url': None,
        'author_id': user.username,
        'created': '2017-11-22T20:19:53+00:00',
        'upvoted': False,
        'removed': False,
        'id': 'gd',
        'num_comments': 0,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": user.profile.image_small,
        "author_name": user.profile.name,
        'edited': False,
        "stickied": False,
    }


# Reddit doesn't indicate if a post deletion failed so we don't have tests for that
def test_delete_post(client, logged_in_profile):
    """Delete a post in a channel"""
    url = reverse('post-detail', kwargs={'post_id': '2'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("missing_user", [True, False])
def test_list_comments(client, logged_in_profile, missing_user):
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
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "id": "1",
            'parent_id': None,
            "post_id": "2",
            "text": "hello world",
            "author_id": author_id,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "created": "2017-07-25T17:09:45+00:00",
            'profile_image': profile_image,
            'author_name': name,
            'edited': False,
            'comment_type': 'comment',
        },
        {
            "id": "2",
            'parent_id': '1',
            "post_id": "2",
            "text": "texty text text",
            "author_id": author_id,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "created": "2017-07-25T17:15:57+00:00",
            'profile_image': profile_image,
            'author_name': name,
            'edited': True,
            'comment_type': 'comment',
        },
        {
            "id": "3",
            'parent_id': '1',
            "post_id": "2",
            "text": "reply2",
            "author_id": author_id,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "created": "2017-07-25T17:16:10+00:00",
            'profile_image': profile_image,
            'author_name': name,
            'edited': False,
            'comment_type': 'comment',
        },
    ]


def test_list_comments_forbidden(client, logged_in_profile):
    """List all comments in the comment tree for a post the user doesn't have access to"""
    url = reverse('comment-list', kwargs={'post_id': 'adc'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_list_comments_not_found(client, logged_in_profile):
    """List all comments in the comment tree for a post that doesn't exist"""
    url = reverse('comment-list', kwargs={'post_id': 'missing'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_list_comments_more(client, logged_in_profile, use_betamax, praw_settings):
    """List comments for a post which has more comments"""
    logged_in_profile.image_small = '/deserunt/consequatur.jpg'
    logged_in_profile.name = 'Brooke Robles'
    logged_in_profile.save()

    url = reverse('comment-list', kwargs={'post_id': '1'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == LIST_MORE_COMMENTS_RESPONSE


@pytest.mark.parametrize("is_root_comment", [True, False])
def test_more_comments(client, logged_in_profile, use_betamax, praw_settings, is_root_comment):
    """Retrieve more comments"""
    image_url = '/deserunt/consequatur.jpg'
    name = 'Brooke Robles'
    username = '01BWRGE5JQK4E8B0H90K9RM4WF'
    UserFactory.create(
        username=username,
        profile__image_small=image_url,
        profile__name=name,
    )

    post_id = "1"
    root_comment, middle_comment, edge_comment = [
        {
            "id": "m",
            "parent_id": "1",
            "post_id": post_id,
            "text": "m",
            "author_id": username,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "created": "2017-10-19T19:47:22+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment"
        },
        {
            "id": "n",
            "parent_id": "m",
            "post_id": post_id,
            "text": "oasd",
            "author_id": username,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "created": "2017-10-23T17:45:14+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment"
        },
        {
            "id": "o",
            "parent_id": "n",
            "post_id": post_id,
            "text": "k;lkl;",
            "author_id": username,
            "score": 1,
            "upvoted": False,
            "downvoted": False,
            "created": "2017-10-23T17:45:25+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment"
        }
    ]

    url = "{base}?post_id={post_id}{parent_query}".format(
        base=reverse('morecomments-detail'),
        post_id=post_id,
        parent_query='' if is_root_comment else '&parent_id={}'.format(middle_comment["id"])
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    if is_root_comment:
        assert resp.json() == [root_comment, middle_comment, edge_comment]
    else:
        assert resp.json() == [edge_comment]


def test_more_comments_children(client, logged_in_profile, use_betamax, praw_settings):
    """Retrieve more comments specifying child elements"""
    image_url = '/deserunt/consequatur.jpg'
    name = 'Brooke Robles'
    username = 'george'

    logged_in_profile.image_small = image_url
    logged_in_profile.name = name
    logged_in_profile.save()

    post_id = "1"
    url = "{base}?post_id={post_id}&parent_id=&children=e9l&children=e9m".format(
        base=reverse('morecomments-detail'),
        post_id=post_id,
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            "id": "e9l",
            "parent_id": None,
            "post_id": "1",
            "text": "shallow comment 25",
            "author_id": username,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "created": "2017-11-09T16:35:55+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment"
        },
        {
            "id": "e9m",
            "parent_id": None,
            "post_id": "1",
            "text": "shallow comment 26",
            "author_id": username,
            "score": 1,
            "upvoted": True,
            "downvoted": False,
            "created": "2017-11-09T16:36:00+00:00",
            "profile_image": image_url,
            "author_name": name,
            "edited": False,
            "comment_type": "comment"
        }
    ]


@pytest.mark.parametrize("missing_post,missing_parent", product([True, False], repeat=2))
def test_more_comments_404(client, logged_in_profile, use_betamax, praw_settings, missing_post, missing_parent):
    """If the post id or comment id is wrong, we should return a 404"""
    post_id = "1"
    url = "{base}?post_id={post_id}{parent_query}".format(
        base=reverse('morecomments-detail'),
        post_id=post_id if not missing_post else 'missing_post',
        parent_query='' if not missing_parent else '&parent_id=missing_parent',
    )
    resp = client.get(url)
    expected_status = status.HTTP_404_NOT_FOUND if missing_post or missing_parent else status.HTTP_200_OK
    assert resp.status_code == expected_status


@pytest.mark.parametrize("missing_param", ["post_id"])
def test_more_comments_missing_param(client, logged_in_profile, use_betamax, praw_settings, missing_param):
    """If a parameter is missing a 400 error should be returned"""
    params = {
        "post_id": "post_id",
        "parent_id": "parent_id",
    }
    del params[missing_param]

    params_string = "&".join("{}={}".format(key, value) for key, value in params.items())

    url = "{base}?{params_string}".format(
        base=reverse('morecomments-detail'),
        params_string=params_string,
    )
    resp = client.get(url)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_list_deleted_comments(client, logged_in_profile, use_betamax, praw_settings):
    """List comments which are deleted according to reddit"""
    user = UserFactory.create(username='admin')

    url = reverse('comment-list', kwargs={'post_id': 'p'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [
        {
            'author_id': '[deleted]',
            'comment_type': 'comment',
            'created': '2017-09-27T16:03:42+00:00',
            'downvoted': False,
            'parent_id': None,
            'post_id': 'p',
            'profile_image': default_profile_image,
            'score': 1,
            'text': '[deleted]',
            'upvoted': False,
            'id': '1s',
            'edited': False,
            "author_name": "[deleted]",
        },
        {
            'author_id': user.username,
            'created': '2017-09-27T16:03:51+00:00',
            'comment_type': 'comment',
            'downvoted': False,
            'id': '1t',
            'parent_id': '1s',
            'post_id': 'p',
            'profile_image': user.profile.image_small,
            'score': 1,
            'text': 'reply to parent which is not deleted',
            'upvoted': False,
            'edited': False,
            "author_name": user.profile.name,
        }
    ]


def test_create_comment(client, logged_in_profile):
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
        'parent_id': None,
        'post_id': post_id,
        'score': 1,
        'text': 'reply_to_post 2',
        'upvoted': True,
        "downvoted": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


def test_create_comment_forbidden(client, logged_in_profile):
    """Create a comment for a post the user doesn't have access to"""
    post_id = 'adc'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_not_found(client, logged_in_profile):
    """Create a comment for a post that doesn't exist"""
    post_id = 'missing'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_post 2",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_create_comment_no_upvote(client, logged_in_profile):
    """Create a comment without an upvote"""
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "no upvoted",
        "upvoted": False,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:21:48+00:00',
        'id': '9',
        'parent_id': None,
        'post_id': post_id,
        'score': 1,
        'text': 'no upvoted',
        'upvoted': False,
        "downvoted": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


def test_create_comment_downvote(client, logged_in_profile):
    """Create a comment with a downvote"""
    post_id = '2'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "downvoted",
        "downvoted": True,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': 'l',
        'parent_id': None,
        'post_id': post_id,
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': True,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


def test_create_comment_reply_to_comment(client, logged_in_profile):
    """Create a comment that's a reply to another comment"""
    post_id = '2'
    parent_comment_id = '3'
    url = reverse('comment-list', kwargs={'post_id': post_id})
    resp = client.post(url, data={
        "text": "reply_to_comment 3",
        "comment_id": parent_comment_id,
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'parent_id': parent_comment_id,
        'post_id': post_id,
        'score': 1,
        'text': 'reply_to_comment 3',
        'upvoted': True,
        "downvoted": False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


def test_update_comment_text(client, logged_in_profile):
    """Update a comment's text"""
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.patch(url, type='json', data={
        "text": "updated text",
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'parent_id': '3',
        'post_id': '2',
        'score': 1,
        'text': 'updated text',
        'upvoted': False,
        'downvoted': False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': True,
        'comment_type': 'comment',
    }


# Reddit returns the same result for updating a missing comment
# as it does for updating a comment the user doesn't own.
def test_update_comment_forbidden(client, logged_in_profile):
    """Update a comment's text for a comment the user doesn't own"""
    url = reverse('comment-detail', kwargs={'comment_id': 'e8h'})
    resp = client.patch(url, type='json', data={
        "text": "updated text",
    })
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_update_comment_upvote(client, logged_in_profile):
    """Update a comment to upvote it"""
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "upvoted": True,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'parent_id': None,
        'post_id': '2',
        'score': 1,
        'text': 'downvoted',
        'upvoted': True,
        'downvoted': False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


def test_update_comment_downvote(client, logged_in_profile):
    """Update a comment to downvote it"""
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "downvoted": True,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'parent_id': None,
        'post_id': '2',
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': True,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


def test_update_comment_clear_upvote(client, logged_in_profile):
    """Update a comment to clear its upvote"""
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.patch(url, type='json', data={
        "upvoted": False,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-07-25T21:18:47+00:00',
        'id': '6',
        'parent_id': '3',
        'post_id': '2',
        'score': 1,
        'text': 'reply_to_comment 3',
        'upvoted': False,
        'downvoted': False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


def test_update_comment_clear_downvote(client, logged_in_profile):
    """Update a comment to clear its downvote"""
    comment_id = 'l'
    url = reverse('comment-detail', kwargs={'comment_id': comment_id})
    resp = client.patch(url, type='json', data={
        "downvoted": False,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'author_id': 'george',
        'created': '2017-08-04T19:22:02+00:00',
        'id': comment_id,
        'parent_id': None,
        'post_id': '2',
        'score': 1,
        'text': 'downvoted',
        'upvoted': False,
        'downvoted': False,
        'profile_image': logged_in_profile.image_small,
        'author_name': logged_in_profile.name,
        'edited': False,
        'comment_type': 'comment',
    }


# Reddit doesn't indicate if a comment deletion failed so we don't have tests that
def test_delete_comment(client, logged_in_profile):
    """Delete a comment"""
    url = reverse('comment-detail', kwargs={'comment_id': '6'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_frontpage_empty(client, logged_in_profile):
    """test that frontpage is empty with no subscriptions"""
    url = reverse('frontpage')
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'posts': [],
        'pagination': {},
    }


@pytest.mark.parametrize("missing_user", [True, False])
def test_frontpage(client, private_channel_and_contributor, reddit_factories, missing_user):
    """View the front page"""
    channel, user = private_channel_and_contributor
    first_post = reddit_factories.text_post('my post', user, channel=channel)
    second_post = reddit_factories.text_post('my 2nd post', user, channel=channel)
    third_post = reddit_factories.text_post('my 3rd post', user, channel=channel)
    fourth_post = reddit_factories.text_post('my 4th post', user, channel=channel)

    client.force_login(user)

    url = reverse('frontpage')
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'posts': [
            {
                "url": None,
                "text": fourth_post.text,
                "title": fourth_post.title,
                "upvoted": True,
                "removed": False,
                "score": 1,
                "author_id": user.username,
                "id": fourth_post.id,
                "created": fourth_post.created,
                "num_comments": 0,
                "channel_name": channel.name,
                "channel_title": channel.title,
                'author_name': user.profile.name,
                "profile_image": user.profile.image_small,
                "edited": False,
                "stickied": False,
            },
            {
                "url": None,
                "text": third_post.text,
                "title": third_post.title,
                "upvoted": True,
                "removed": False,
                "score": 1,
                "author_id": user.username,
                "id": third_post.id,
                "created": third_post.created,
                "num_comments": 0,
                "channel_name": channel.name,
                "channel_title": channel.title,
                'author_name': user.profile.name,
                "profile_image": user.profile.image_small,
                "edited": False,
                "stickied": False,
            },
            {
                "url": None,
                "text": second_post.text,
                "title": second_post.title,
                "upvoted": True,
                "removed": False,
                "score": 1,
                "author_id": user.username,
                "id": second_post.id,
                "created": second_post.created,
                "num_comments": 0,
                "channel_name": channel.name,
                "channel_title": channel.title,
                'author_name': user.profile.name,
                "profile_image": user.profile.image_small,
                "edited": False,
                "stickied": False,
            },
            {
                "url": None,
                "text": first_post.text,
                "title": first_post.title,
                "upvoted": True,
                "removed": False,
                "score": 1,
                "author_id": user.username,
                "id": first_post.id,
                "created": first_post.created,
                "num_comments": 0,
                "channel_name": channel.name,
                "channel_title": channel.title,
                'author_name': user.profile.name,
                "profile_image": user.profile.image_small,
                "edited": False,
                "stickied": False,
            },
        ],
        'pagination': {},
    }


@pytest.mark.parametrize('params,expected', [
    ({}, {'after': 't3_3', 'after_count': 5}),
    ({'after': 't3_3', 'count': '5'}, {'after': 't3_7', 'after_count': 10, 'before': 't3_e', 'before_count': 6}),
    ({'after': 't3_a', 'count': '3'}, {'after': 't3_b', 'after_count': 8, 'before': 't3_9', 'before_count': 4}),
    ({'before': 't3_e', 'count': '6'}, {'after': 't3_3', 'after_count': 5}),
])
def test_frontpage_pagination(client, logged_in_profile, settings, params, expected):
    """Test that post pagination works"""
    settings.OPEN_DISCUSSIONS_CHANNEL_POST_LIMIT = 5
    url = reverse('frontpage')
    resp = client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_contributors(client, logged_in_profile):
    """
    List contributors in a channel
    """
    url = reverse('contributor-list', kwargs={'channel_name': 'test_channel'})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{'contributor_name': 'othercontributor'}, {'contributor_name': 'fooadmin'}]


def test_list_moderators(client, private_channel_and_contributor, staff_user):
    """
    List moderators in a channel
    """
    channel, user = private_channel_and_contributor
    url = reverse('moderator-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == [{'moderator_name': staff_user.username}]


def test_list_subscribers_not_allowed(client, staff_jwt_header):
    """
    Get method not allowed on the list of subscribers
    """
    url = reverse('subscriber-list', kwargs={'channel_name': 'test_channel'})
    assert client.get(url, **staff_jwt_header).status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_add_contributor(client, staff_jwt_header):
    """
    Adds a contributor to a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': contributor.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'contributor_name': contributor.username}


def test_add_contributor_again(client, staff_jwt_header):
    """
    If the user is already a contributor a 201 status should be returned
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('contributor-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'contributor_name': contributor.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'contributor_name': contributor.username}


def test_add_moderator(client, staff_jwt_header):
    """
    Adds a moderator to a channel
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('moderator-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'moderator_name': moderator.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'moderator_name': moderator.username}


def test_add_moderator_again(client, staff_jwt_header):
    """
    If a user is already a moderator we should return 201 without making any changes
    """
    moderator = UserFactory.create(username='already_mod')
    url = reverse('moderator-list', kwargs={'channel_name': 'a_channel'})
    resp = client.post(url, data={'moderator_name': moderator.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'moderator_name': moderator.username}


def test_add_subscriber(client, staff_jwt_header):
    """
    Adds a subscriber to a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_add_subscriber_again(client, staff_jwt_header):
    """
    If a user is already part of a channel we should return a 201 status
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_add_subscriber_forbidden(client, staff_jwt_header):
    """
    If a user gets a 403 from praw we should return a 403 status
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse('subscriber-list', kwargs={'channel_name': 'admin_channel'})
    resp = client.post(url, data={'subscriber_name': subscriber.username}, format='json', **staff_jwt_header)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_detail_contributor_error(client):
    """
    Detail of a contributor in a channel in case the user is not a contributor
    """
    admin = UserFactory.create(username='fooadmin')
    client.force_login(admin)
    nocontributor = UserFactory.create(username='nocontributor')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'test_channel', 'contributor_name': nocontributor.username})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_detail_contributor(client):
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


def test_detail_subscriber(client, staff_jwt_header):
    """
    Detail of a subscriber in a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.get(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {'subscriber_name': subscriber.username}


def test_detail_subscriber_missing(client):
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


def test_remove_contributor(client, staff_jwt_header):
    """
    Removes a contributor from a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'admin_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_contributor_again(client, staff_jwt_header):
    """
    Removes a contributor from a channel
    """
    contributor = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'contributor-detail', kwargs={'channel_name': 'admin_channel', 'contributor_name': contributor.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_moderator(client, staff_jwt_header):
    """
    Removes a moderator from a channel
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_moderator_again(client, staff_jwt_header):
    """
    If a user is already not a moderator for a channel we should still return a 204
    """
    moderator = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'moderator-detail', kwargs={'channel_name': 'admin_channel', 'moderator_name': moderator.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_subscriber(client, staff_jwt_header):
    """
    Removes a subscriber from a channel
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_remove_subscriber_again(client, staff_jwt_header):
    """
    The API should return a 204 even if the user isn't there
    """
    subscriber = UserFactory.create(username='01BTN6G82RKTS3WF61Q33AA0ND')
    url = reverse(
        'subscriber-detail', kwargs={'channel_name': 'admin_channel', 'subscriber_name': subscriber.username})
    resp = client.delete(url, **staff_jwt_header)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


def test_api_exception(client, logged_in_profile, mocker):
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
