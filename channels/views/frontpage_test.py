"""Tests for views for REST APIs for frontpage"""
# pylint: disable=unused-argument
import pytest
from django.core.urlresolvers import reverse
from rest_framework import status

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures("use_betamax", "praw_settings"),
]


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
