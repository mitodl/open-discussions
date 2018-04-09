"""Test to assert URLs"""
from django.urls import reverse


def test_urls():
    """Assert URLs which match to views"""
    assert reverse('channel-list') == '/api/v0/channels/'
    assert reverse('channel-detail', kwargs={"channel_name": 'a_channel'}) == '/api/v0/channels/a_channel/'
    assert reverse('post-list', kwargs={"channel_name": 'a_channel'}) == '/api/v0/channels/a_channel/posts/'
    assert reverse('post-detail', kwargs={"post_id": '6'}) == '/api/v0/posts/6/'
    assert reverse('comment-list', kwargs={"post_id": '6'}) == '/api/v0/posts/6/comments/'
    assert reverse('comment-detail', kwargs={"comment_id": '2b'}) == '/api/v0/comments/2b/'
    assert reverse('frontpage') == '/api/v0/frontpage/'
