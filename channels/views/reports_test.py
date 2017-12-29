"""Tests for views for REST APIs for reports"""
import pytest
from django.core.urlresolvers import reverse
from rest_framework import status

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.usefixtures("use_betamax", "praw_settings"),
]


def test_report_post(client, private_channel_and_contributor, reddit_factories):
    """Report a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('post', user, channel=channel)
    url = reverse('report-content')
    client.force_login(user)
    payload = {
        'post_id': post.id,
        'reason': 'spam',
    }
    resp = client.post(url, data=payload)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == payload


def test_report_comment(client, private_channel_and_contributor, reddit_factories):
    """Report a post"""
    channel, user = private_channel_and_contributor
    post = reddit_factories.text_post('post', user, channel=channel)
    comment = reddit_factories.comment("comment", user, post_id=post.id)
    url = reverse('report-content')
    client.force_login(user)
    payload = {
        'comment_id': comment.id,
        'reason': 'spam',
    }
    resp = client.post(url, data=payload)
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json() == payload
