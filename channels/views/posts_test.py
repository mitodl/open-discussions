"""Tests for views for REST APIs for posts"""
# pylint: disable=unused-argument,too-many-lines
from types import SimpleNamespace
import pytest
from django.urls import reverse
from rest_framework import status

from profiles.utils import image_uri
from channels.factories import LinkMetaFactory
from channels.utils import get_reddit_slug
from channels.constants import (
    VALID_POST_SORT_TYPES,
    POSTS_SORT_HOT,
)
from channels.models import Subscription, LinkMeta
from open_discussions.constants import (
    NOT_AUTHENTICATED_ERROR_TYPE,
    PERMISSION_DENIED_ERROR_TYPE,
    DJANGO_PERMISSION_ERROR_TYPES
)
from open_discussions.factories import UserFactory
from open_discussions.features import ANONYMOUS_ACCESS

pytestmark = pytest.mark.betamax


def default_response_data(channel, post, user):
    """
    Helper function. Returns a dict containing some of the data that we expect from the API given
    a channel, post, and user.
    """
    # For some reason, the default values are different for staff and non-staff users
    if user.is_staff:
        user_dependent_defaults = {
            'upvoted': False,
            'num_reports': 0
        }
    else:
        user_dependent_defaults = {
            'upvoted': True,
            'num_reports': None
        }

    return {
        'url': None,
        'thumbnail': None,
        'text': post.text,
        'title': post.title,
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
        **user_dependent_defaults
    }


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
        'created': '2018-08-24T18:02:48+00:00',
        'upvoted': True,
        'id': '14',
        'slug': 'url-title',
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
        'created': '2018-08-24T18:03:18+00:00',
        'upvoted': True,
        'removed': False,
        'deleted': False,
        'subscribed': True,
        'id': '17',
        'slug': 'parameterized-testing',
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


def test_create_post_forbidden(user_client, private_channel):
    """
    Create a new text post for a channel the user doesn't have permission to
    """
    url = reverse('post-list', kwargs={'channel_name': private_channel.name})
    resp = user_client.post(url, {
        'title': 'parameterized testing',
        'text': 'tests are great',
    })
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
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    assert resp.data['error_type'] == NOT_AUTHENTICATED_ERROR_TYPE


@pytest.mark.parametrize("missing_user", [True, False])
def test_get_deleted_post(staff_client, missing_user, private_channel_and_contributor, reddit_factories):
    """Get an existing post for a deleted user"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post("deleted", user, channel=channel)

    if missing_user:
        user.username = 'renamed'
        user.save()

    url = reverse('post-detail', kwargs={'post_id': post.id})
    resp = staff_client.get(url)
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

    post = reddit_factories.text_post('my great post', user, channel=channel)
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
        'slug': 'my-great-post',
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


def test_get_post_no_profile(client, private_channel_and_contributor, reddit_factories):
    """Get an existing post for a user with no profile"""
    channel, user = private_channel_and_contributor
    user.profile.delete()

    post = reddit_factories.text_post('my great post', user, channel=channel)
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
        'slug': 'my-great-post',
        "created": post.created,
        "num_comments": 0,
        "channel_name": channel.name,
        "channel_title": channel.title,
        'author_name': '[deleted]',
        "author_headline": None,
        "profile_image": image_uri(None),
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
        'slug': 'just-a-post',
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
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
        assert resp.data['error_type'] == NOT_AUTHENTICATED_ERROR_TYPE


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
        user_client, settings, private_channel_and_contributor, reddit_factories
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
    resp = user_client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_first_page_with_params(
        user_client, settings, private_channel_and_contributor, reddit_factories
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
    resp = user_client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_non_first_page(
        user_client, settings, private_channel_and_contributor, reddit_factories
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
    resp = user_client.get(url, params)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


def test_list_posts_pagination_non_offset_page(
        user_client, settings, private_channel_and_contributor, reddit_factories
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
    resp = user_client.get(url, params)
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
                'slug': 'link-post',
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
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
        assert resp.data['error_type'] == NOT_AUTHENTICATED_ERROR_TYPE


def test_create_post_without_upvote(user_client, private_channel_and_contributor):
    """Test creating a post without an upvote in the body"""
    channel, user = private_channel_and_contributor
    url = reverse('post-list', kwargs={'channel_name': channel.name})
    resp = user_client.post(url, {
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
        'created': '2018-08-24T18:14:32+00:00',
        'upvoted': False,
        'removed': False,
        'deleted': False,
        'subscribed': True,
        'id': '43',
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


class PostDetailTests:
    """Tests for the post-detail endpoint"""
    def scenario(self, private_channel_and_contributor, reddit_factories, staff_user):
        """Fixture that sets up a common scenario for post-detail tests"""
        channel, user = private_channel_and_contributor
        post = reddit_factories.text_post('just a post', user, channel=channel)
        url = reverse('post-detail', kwargs={'post_id': post.id})
        default_response = default_response_data(channel, post, user)
        default_staff_response = default_response_data(channel, post, staff_user)
        return SimpleNamespace(
            channel=channel,
            user=user,
            staff_user=staff_user,
            post=post,
            url=url,
            default_response=default_response,
            default_staff_response=default_staff_response,
        )

    @pytest.mark.parametrize('request_data,exp_response_data', [
        ({"text": "overwrite"}, {"text": "overwrite"}),
        ({"upvoted": False}, {"upvoted": False}),
        ({"upvoted": True}, {"upvoted": True})
    ])
    def test_update_post(
            self,
            user_client,
            scenario,
            request_data,
            exp_response_data
    ):
        """
        Test that non-staff users are allowed to make certain requests to update a post, and that
        the response from the API matches our expectations
        """
        resp = user_client.patch(scenario.url, format='json', data=request_data)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            **scenario.default_response,
            **exp_response_data
        }

    @pytest.mark.parametrize('request_data,exp_response_data', [
        ({"ignore_reports": True}, {}),
        ({"removed": True}, {"removed": True}),
        ({"stickied": True}, {"stickied": True})
    ])
    def test_update_post_staff_only(
            self,
            staff_client,
            scenario,
            request_data,
            exp_response_data
    ):
        """
        Test that staff users are allowed to make certain requests to update a post, and that
        the response from the API matches our expectations
        """
        resp = staff_client.patch(scenario.url, format='json', data=request_data)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            **scenario.default_staff_response,
            **exp_response_data
        }

    @pytest.mark.parametrize('request_data', [
        {"ignore_reports": True},
        {"removed": True},
        {"stickied": True}
    ])
    def test_update_post_non_staff_error(
            self,
            user_client,
            scenario,
            request_data
    ):
        """
        Test that non-staff users attempting to make staff-only updates to a post will result in a
        permission error
        """
        resp = user_client.patch(scenario.url, format='json', data=request_data)
        assert resp.status_code in DJANGO_PERMISSION_ERROR_TYPES
        assert resp.data == {
            'error_type': PERMISSION_DENIED_ERROR_TYPE,
            'detail': 'You do not have permission to perform this action.',
        }

    def test_update_post_unsticky(self, staff_client, staff_api, scenario):
        """Test updating just the stickied boolean on a post"""
        staff_api.pin_post(scenario.post.id, True)
        resp = staff_client.patch(scenario.url, format='json', data={"stickied": False})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()['stickied'] is False

    def test_update_post_clear_removed(self, staff_client, staff_api, scenario):
        """Test updating a post to re-approve it"""
        staff_api.remove_post(scenario.post.id)
        resp = staff_client.patch(scenario.url, format='json', data={"removed": False})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            **scenario.default_staff_response,
            "removed": False
        }

    def test_update_post_forbidden(self, staff_client, scenario):
        """Test updating a post the user isn't the owner of"""
        resp = staff_client.patch(scenario.url, format='json', data={"text": "overwrite"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_update_post_not_found(self, user_client):
        """Test updating a post that doesn't exist"""
        url = reverse('post-detail', kwargs={'post_id': 'missing'})
        resp = user_client.patch(url, format='json', data={"text": "overwrite"})
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    # Reddit doesn't indicate if a post deletion failed so we don't have tests for that
    def test_delete_post(self, user_client, scenario):
        """Delete a post in a channel"""
        resp = user_client.delete(scenario.url)
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    @pytest.mark.parametrize('has_post_subscription,has_comment_subscription,expected_before,expected_after', [
        (True, False, 1, 1),
        (True, True, 2, 2),
        (False, True, 1, 2),
        (False, False, 0, 1),
    ])
    def test_subscribe_post(
            self, staff_client, staff_api, scenario, reddit_factories,
            has_post_subscription, has_comment_subscription, expected_before, expected_after
    ):  # pylint: disable=too-many-arguments
        """Test subscribing to a post"""
        comment = reddit_factories.comment('just a comment', scenario.user, post_id=scenario.post.id)
        if has_post_subscription:
            staff_api.add_post_subscription(scenario.post.id)
        if has_comment_subscription:
            staff_api.add_comment_subscription(scenario.post.id, comment.id)
        assert Subscription.objects.count() == expected_before
        resp = staff_client.patch(scenario.url, {
            'subscribed': True,
        })
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            **scenario.default_response,
            'subscribed': True
        }
        assert Subscription.objects.count() == expected_after

    def test_unsubscribe_post(self, user_client, contributor_api, scenario):
        """Test unsubscribing to a post"""
        contributor_api.add_post_subscription(scenario.post.id)
        resp = user_client.patch(scenario.url, {
            'subscribed': False,
        })
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json() == {
            **scenario.default_response,
            'subscribed': False
        }


@pytest.mark.parametrize("allow_anonymous", [True, False])
def test_post_anonymous(client, settings, allow_anonymous):
    """Anonymous users can't update or delete posts"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous
    url = reverse('post-detail', kwargs={'post_id': 'doesntmatter'})
    update_resp = client.patch(url, format='json', data={'text': 'overwrite'})
    delete_resp = client.delete(url)
    for resp in [update_resp, delete_resp]:
        assert resp.status_code in DJANGO_PERMISSION_ERROR_TYPES
        assert resp.data['error_type'] == NOT_AUTHENTICATED_ERROR_TYPE
