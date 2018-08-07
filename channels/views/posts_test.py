"""Tests for views for REST APIs for posts"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from profiles.utils import image_uri
from channels.factories import LinkMetaFactory
from channels.api import Api
from channels.utils import get_reddit_slug
from channels.constants import (
    VALID_POST_SORT_TYPES,
    POSTS_SORT_HOT,
)
from channels.models import Subscription, LinkMeta
from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

# pylint: disable=too-many-lines

pytestmark = pytest.mark.betamax


def test_create_url_post_existing_meta(client, private_channel_and_contributor, mocker, settings):
    """
    Create a new url post
    """
    settings.EMBEDLY_KEY = 'FAKE'
    channel, user = private_channel_and_contributor
    link_url = 'http://micromasters.mit.edu/🐨'
    thumbnail = 'http://fake/thumb.jpg'
    embedly_stub = mocker.patch('channels.utils.get_embedly')
    LinkMetaFactory.create(url=link_url, thumbnail=thumbnail)
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'url title 🐨',
        'url': link_url,
    })
    assert embedly_stub.not_called()
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == {
        'title': 'url title 🐨',
        'url': link_url,
        "thumbnail": thumbnail,
        'text': None,
        'author_id': user.username,
        'created': '2018-07-19T17:13:55+00:00',
        'upvoted': True,
        'id': '1v',
        'slug': 'url_title',
        'num_comments': 0,
        'removed': False,
        'deleted': False,
        'subscribed': True,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


def test_post_create_post_new_meta(client, private_channel_and_contributor, mocker, settings):
    """ Tests that a new LinkMeta object is created for the URL if none exists"""
    settings.EMBEDLY_KEY = 'FAKE'
    channel, user = private_channel_and_contributor
    link_url = 'http://fake'
    thumbnail = 'http://fake/thumbnail.jpg'
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{
        'json.return_value': {'some': 'json', 'thumbnail_url': thumbnail}
    })
    embedly_stub = mocker.patch('channels.utils.get_embedly', return_value=embed_return_value)
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    client.post(url, {
        'title': 'url title 🐨',
        'url': link_url,
    })
    assert embedly_stub.called_with(link_url)
    assert LinkMeta.objects.filter(url=link_url).first() is not None


def test_post_create_post_no_thumbnail(client, private_channel_and_contributor, mocker, settings):
    """ Tests that no LinkMeta object is created if embedly does not return a thumbnail """
    settings.EMBEDLY_KEY = 'FAKE'
    channel, user = private_channel_and_contributor
    link_url = 'http://fake'
    embed_return_value = mocker.Mock()
    embed_return_value.configure_mock(**{
        'json.return_value': {'some': 'json'}
    })
    embedly_stub = mocker.patch('channels.utils.get_embedly', return_value=embed_return_value)
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    client.post(url, {
        'title': 'url title 🐨',
        'url': link_url,
    })
    assert embedly_stub.called_once()
    assert LinkMeta.objects.filter(url=url).first() is None


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
        "thumbnail": None,
        'author_id': user.username,
        'created': '2017-11-22T17:29:51+00:00',
        'upvoted': True,
        'removed': False,
        'deleted': False,
        'subscribed': True,
        'id': 'e7',
        'slug': 'parameterized_testing',
        'num_comments': 0,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        'profile_image': image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


def test_create_text_post_blank(client, private_channel_and_contributor):
    """
    Create a new text post with no text
    """
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    client.force_login(user)
    resp = client.post(url, {
        'title': 'blank post'
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()['text'] == ''


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


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_create_post_anonymous(client, settings, allow_anonymous):
    """
    Anonymous users can't create posts
    """
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('post-list', kwargs={'channel_name': 'doesnt_matter'})
    resp = client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


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

    post = reddit_factories.text_post('my geat post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.get(url)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        "url": None,
        "thumbnail": None,
        "text": post.text,
        "title": post.title,
        "upvoted": True,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        "score": 1,
        "author_id": user.username,
        "id": post.id,
        'slug': get_reddit_slug(post.permalink),
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "author_headline": user.profile.headline,
        "profile_image": image_uri(user.profile),
        'edited': False,
        "stickied": False,
        'num_reports': None,
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
        "thumbnail": None,
        "text": post.text,
        "title": post.title,
        "upvoted": True,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        "score": 1,
        "author_id": user.username,
        "id": post.id,
        'slug': get_reddit_slug(post.permalink),
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': user.profile.name,
        "author_headline": user.profile.headline,
        "profile_image": image_uri(user.profile),
        "edited": False,
        "stickied": True,
        'num_reports': None,
    }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_get_post_anonymous(client, public_channel, reddit_factories, settings, allow_anonymous):
    """Anonymous users can see posts for a public channel, if the feature flag is set"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    user = UserFactory.create(username='01CBFJMB9PD3JP17KAX3E5JQ46')
    post = reddit_factories.link_post("link_post", user=user, channel=public_channel)

    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            'author_id': user.username,
            'author_name': user.profile.name,
            "author_headline": user.profile.headline,
            'channel_name': public_channel.name,
            'channel_title': public_channel.title,
            'created': post.created,
            'edited': False,
            'id': post.id,
            'slug': get_reddit_slug(post.permalink),
            'num_comments': 0,
            'num_reports': None,
            'profile_image': image_uri(user.profile),
            'removed': False,
            'deleted': False,
            'score': 1,
            'stickied': False,
            'subscribed': False,
            'text': None,
            'title': post.title,
            'upvoted': False,
            'url': post.url,
            'thumbnail': None,
        }
    else:
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


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
            'pagination': {
                'sort': POSTS_SORT_HOT,
            }
        }
    else:
        assert resp.json() == {
            'posts': [
                {
                    "url": post.url,
                    "thumbnail": None,
                    "text": post.text,
                    "title": post.title,
                    "upvoted": True,
                    "removed": False,
                    "deleted": False,
                    "subscribed": False,
                    "score": 1,
                    "author_id": user.username,
                    "id": post.id,
                    'slug': get_reddit_slug(post.permalink),
                    "created": post.created,
                    "num_comments": 0,
                    "channel_name": channel.name,
                    "channel_title": channel.title,
                    "author_name": user.profile.name,
                    "author_headline": user.profile.headline,
                    "profile_image": image_uri(user.profile),
                    "edited": False,
                    "stickied": False,
                    'num_reports': None,
                } for post in posts
            ],
            'pagination': {
                'sort': POSTS_SORT_HOT,
            }
        }


def test_list_posts_none(client, private_channel_and_contributor):
    """List posts in a channel"""
    channel, user = private_channel_and_contributor
    client.force_login(user)
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'posts': [],
        'pagination': {
            'sort': POSTS_SORT_HOT,
        }
    }


@pytest.mark.parametrize("sort", VALID_POST_SORT_TYPES)
def test_list_posts_sorted(client, private_channel_and_contributor, reddit_factories, sort):
    """View the channel listing with sorted options"""
    # note: these sort types are difficult to reproduce unique sort orders in the span of a test,
    #       so we're just checking that the APIs don't error
    channel, user = private_channel_and_contributor
    first_post = reddit_factories.text_post('my post', user, channel=channel)
    second_post = reddit_factories.text_post('my 2nd post', user, channel=channel)
    third_post = reddit_factories.text_post('my 3rd post', user, channel=channel)
    fourth_post = reddit_factories.text_post('my 4th post', user, channel=channel)

    client.force_login(user)

    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, {'sort': sort})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'posts': [{
            "url": None,
            "thumbnail": None,
            "text": post.text,
            "title": post.title,
            "upvoted": True,
            "removed": False,
            "deleted": False,
            "subscribed": False,
            "score": 1,
            "author_id": user.username,
            "id": post.id,
            'slug': get_reddit_slug(post.permalink),
            "created": post.created,
            "num_comments": 0,
            "channel_name": channel.name,
            "channel_title": channel.title,
            "author_name": user.profile.name,
            "author_headline": user.profile.headline,
            "profile_image": image_uri(user.profile),
            "edited": False,
            "stickied": False,
            'num_reports': None,
        } for post in [fourth_post, third_post, second_post, first_post]],
        'pagination': {
            'sort': sort,
        },
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
        "thumbnail": None,
        "text": posts[2].text,
        "title": posts[2].title,
        "upvoted": True,
        "removed": False,
        "deleted": False,
        "subscribed": False,
        "score": 1,
        "author_id": user.username,
        "id": posts[2].id,
        'slug': get_reddit_slug(posts[2].permalink),
        "created": posts[2].created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "profile_image": image_uri(user.profile),
        "edited": False,
        "stickied": True,
        'num_reports': None,
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
    expected = {
        'after': 't3_{}'.format(posts[4].id),
        'after_count': 5,
        'sort': POSTS_SORT_HOT,
    }
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
    expected = {
        'after': 't3_{}'.format(posts[4].id),
        'after_count': 5,
        'sort': POSTS_SORT_HOT,
    }
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
        'after_count': 10,
        'sort': POSTS_SORT_HOT,
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
        'after_count': 10,
        'sort': POSTS_SORT_HOT,
    }
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = client.get(url, params, **jwt_header)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_list_posts_anonymous(client, public_channel, reddit_factories, settings, allow_anonymous):
    """Anonymous users can see posts for a public channel, if the feature flag is set"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    user = UserFactory.create(username='01CBFJMB9PD3JP17KAX3E5JQ46')
    post = reddit_factories.link_post("link_post", user=user, channel=public_channel)

    url = reverse('post-list', kwargs={'channel_name': public_channel.name})
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            'pagination': {'sort': 'hot'},
            'posts': [{
                'author_id': user.username,
                'author_name': user.profile.name,
                'author_headline': user.profile.headline,
                'channel_name': public_channel.name,
                'channel_title': public_channel.title,
                'created': post.created,
                'edited': False,
                'id': post.id,
                'slug': get_reddit_slug(post.permalink),
                'num_comments': 0,
                'num_reports': None,
                'profile_image': image_uri(user.profile),
                'removed': False,
                'deleted': False,
                'score': 1,
                'stickied': False,
                'subscribed': False,
                'text': None,
                'title': post.title,
                'upvoted': False,
                'url': post.url,
                'thumbnail': None,
            }]
        }
    else:
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


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
        'thumbnail': None,
        'text': 'overwrite',
        'title': post.title,
        'upvoted': True,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': None,
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
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": True,
        'num_reports': 0,
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
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': None,
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
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
        'upvoted': True,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'score': 1,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "stickied": False,
        'num_reports': None,
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
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': True,
        'deleted': False,
        'subscribed': False,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        "edited": False,
        "stickied": False,
        'num_reports': 0,
    }


def test_update_post_clear_removed(
        client, staff_user, staff_api, private_channel_and_contributor, reddit_factories
):
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
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': 0,
    }


def test_update_post_ignore_reports(
        client, staff_user, staff_api, private_channel_and_contributor, reddit_factories
):
    """Test updating a post to ignore reports"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(staff_user)
    resp = client.patch(url, format='json', data={"ignore_reports": True})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'url': None,
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
        'upvoted': False,
        'score': 1,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'author_id': user.username,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'created': post.created,
        'num_comments': 0,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': 0,
    }


def test_update_post_ignore_reports_forbidden(client, private_channel_and_contributor, reddit_factories):
    """Test updating a post to ignore reports with a nonstaff user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.patch(url, format='json', data={"ignore_reports": True})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


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


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_update_post_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't update posts"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('post-detail', kwargs={'post_id': 'doesntmatter'})
    resp = client.patch(url, format='json', data={'text': 'overwrite'})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


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
        'thumbnail': None,
        'author_id': user.username,
        'created': '2017-11-22T20:19:53+00:00',
        'upvoted': False,
        'removed': False,
        'deleted': False,
        'subscribed': True,
        'id': 'gd',
        'slug': 'x',
        'num_comments': 0,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }


# Reddit doesn't indicate if a post deletion failed so we don't have tests for that
def test_delete_post(client, logged_in_profile):
    """Delete a post in a channel"""
    url = reverse('post-detail', kwargs={'post_id': '2'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_delete_post_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't delete posts"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('post-detail', kwargs={'post_id': 'doesnt_matter'})
    resp = client.delete(url)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize('has_post_subscription,has_comment_subscription,expected_before,expected_after', [
    (True, False, 1, 1),
    (True, True, 2, 2),
    (False, True, 1, 2),
    (False, False, 0, 1),
])
def test_subscribe_post(
        client, private_channel_and_contributor, reddit_factories, staff_user,
        has_post_subscription, has_comment_subscription, expected_before, expected_after
):  # pylint: disable=too-many-arguments
    """Test subscribing to a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    comment = reddit_factories.comment('just a comment', user, post_id=post.id)
    api = Api(staff_user)
    if has_post_subscription:
        api.add_post_subscription(post.id)
    if has_comment_subscription:
        api.add_comment_subscription(post.id, comment.id)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(staff_user)
    assert Subscription.objects.count() == expected_before
    resp = client.patch(url, {
        'subscribed': True,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'title': post.title,
        'text': post.text,
        'url': None,
        'thumbnail': None,
        'author_id': user.username,
        'created': post.created,
        'upvoted': False,
        'removed': False,
        'deleted': False,
        'subscribed': True,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'num_comments': 1,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': 0,
    }
    assert Subscription.objects.count() == expected_after


def test_unsubscribe_post(client, private_channel_and_contributor, reddit_factories):
    """Test unsubscribing to a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('just a post', user, channel=channel)
    api = Api(user)
    api.add_post_subscription(post.id)
    url = reverse('post-detail', kwargs={'post_id': post.id})
    client.force_login(user)
    resp = client.patch(url, {
        'subscribed': False,
    })
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'title': post.title,
        'text': post.text,
        'url': None,
        'thumbnail': None,
        'author_id': user.username,
        'created': post.created,
        'upvoted': True,
        'removed': False,
        'deleted': False,
        'subscribed': False,
        'id': post.id,
        'slug': get_reddit_slug(post.permalink),
        'num_comments': 0,
        'score': 1,
        'channel_name': channel.name,
        'channel_title': channel.title,
        "profile_image": image_uri(user.profile),
        "author_name": user.profile.name,
        "author_headline": user.profile.headline,
        'edited': False,
        "stickied": False,
        'num_reports': None,
    }
