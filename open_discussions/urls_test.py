"""Tests for URLs"""

from unittest import TestCase
from django.urls import reverse


class URLTests(TestCase):
    """URL tests"""

    def test_urls(self):
        """Make sure URLs match with resolved names"""
        assert reverse('open_discussions-index') == '/'
        assert reverse(
            'channel-post', kwargs={
                'channel_name': 'channel1',
                'post_id': '1n',
                'post_slug': 'a_slug'
            }) == '/c/channel1/1n/a_slug/'
        assert reverse(
            'channel-post-comment',
            kwargs={
                'channel_name': 'channel1',
                'post_id': '1n',
                'post_slug': 'a_slug',
                'comment_id': 'b4'
            }) == '/c/channel1/1n/a_slug/comment/b4/'
