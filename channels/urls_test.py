"""Test to assert URLs"""
from django.core.urlresolvers import reverse


def test_urls():
    """Assert URLs which match to views"""
    assert reverse('channel-list') == '/api/v0/channels/'
    assert reverse('channel-detail', kwargs={"channel_name": 'a_channel'}) == '/api/v0/channels/a_channel/'
