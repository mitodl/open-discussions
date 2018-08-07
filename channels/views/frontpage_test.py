"""Tests for views for REST APIs for frontpage"""
# pylint: disable=unused-argument
import pytest
from django.urls import reverse
from rest_framework import status

from channels.constants import (
    POSTS_SORT_HOT,
    VALID_POST_SORT_TYPES,
)
from channels.utils import get_reddit_slug
from open_discussions.features import ANONYMOUS_ACCESS
from profiles.utils import image_uri

pytestmark = pytest.mark.betamax


def test_frontpage_empty(client, logged_in_profile):
    """test that frontpage is empty with no subscriptions"""
    url = reverse('frontpage')
    resp = client.get(url)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json() == {
        'posts': [],
        'pagination': {
            'sort': POSTS_SORT_HOT,
        },
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
        'posts': [{
            "url": None,
            "thumbnail": None,
            "text": post.text,
            "title": post.title,
            "upvoted": True,
            "removed": False,
            "deleted": False,
            'subscribed': False,
            "score": 1,
            "author_id": user.username,
            "id": post.id,
            "slug": get_reddit_slug(post.permalink),
            "created": post.created,
            "num_comments": 0,
            "channel_name": channel.name,
            "channel_title": channel.title,
            "author_name": user.profile.name,
            "author_headline": user.profile.headline,
            "profile_image": image_uri(user.profile),
            "edited": False,
            "stickied": False,
            "num_reports": None,
        } for post in [fourth_post, third_post, second_post, first_post]],
        'pagination': {
            'sort': POSTS_SORT_HOT,
        },
    }


@pytest.mark.parametrize("sort", VALID_POST_SORT_TYPES)
def test_frontpage_sorted(client, private_channel_and_contributor, reddit_factories, sort):
    """View the front page with sorted options"""
    # note: these sort types are difficult to reproduce unique sort orders in the span of a test,
    #       so we're just checking that the APIs don't error
    channel, user = private_channel_and_contributor
    first_post = reddit_factories.text_post('my post', user, channel=channel)
    second_post = reddit_factories.text_post('my 2nd post', user, channel=channel)
    third_post = reddit_factories.text_post('my 3rd post', user, channel=channel)
    fourth_post = reddit_factories.text_post('my 4th post', user, channel=channel)

    client.force_login(user)

    url = reverse('frontpage')
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
            'subscribed': False,
            "score": 1,
            "author_id": user.username,
            "id": post.id,
            "slug": get_reddit_slug(post.permalink),
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
    expected['sort'] = POSTS_SORT_HOT
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()['pagination'] == expected


@pytest.mark.parametrize('allow_anonymous', [True, False])
def test_frontpage_anonymous(client, public_channel, settings, allow_anonymous):
    """Anonymous users should be able to see the front page"""
    settings.FEATURES[ANONYMOUS_ACCESS] = allow_anonymous

    url = reverse('frontpage')
    resp = client.get(url)
    if allow_anonymous:
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json()['pagination'] == {
            'sort': POSTS_SORT_HOT,
        }
        # Since the front page is shared between all channels it's hard to assert reproduceable results
        assert isinstance(resp.json()['posts'], list) is True
    else:
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
