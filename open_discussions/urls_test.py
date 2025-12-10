"""Tests for URLs"""
from urllib.parse import quote_plus

import pytest
from django.urls import reverse
from django.urls.exceptions import NoReverseMatch


def test_index():
    """Test that the index URL is set correctly"""
    assert reverse("open_discussions-index") == "/"


@pytest.mark.parametrize(
    "post_slug",
    [
        "dash-slug",
        "underscore_slug",
        "CAP-SLUG",
        "12345",
        "ünícôdę-chärâctêrs_123",
    ],
)
def test_post_slug_match(post_slug):
    """Test that our post slug regex correctly matches valid values"""
    assert reverse(
        "channel-post",
        kwargs={"channel_name": "channel1", "post_id": "1n", "post_slug": post_slug},
    ) == f"/c/channel1/1n/{quote_plus(post_slug)}"
    assert reverse(
        "channel-post-comment",
        kwargs={
            "channel_name": "channel1",
            "post_id": "1n",
            "post_slug": post_slug,
            "comment_id": "b4",
        },
    ) == f"/c/channel1/1n/{quote_plus(post_slug)}/comment/b4"


@pytest.mark.parametrize("post_slug", ["spaced slug", "non-alphanum-$"])
def test_post_slug_match_fail(post_slug):
    """Test that our post slug regex does not match invalid values"""
    with pytest.raises(NoReverseMatch):
        reverse(
            "channel-post",
            kwargs={
                "channel_name": "channel1",
                "post_id": "1n",
                "post_slug": post_slug,
            },
        )
    with pytest.raises(NoReverseMatch):
        reverse(
            "channel-post-comment",
            kwargs={
                "channel_name": "channel1",
                "post_id": "1n",
                "post_slug": post_slug,
                "comment_id": "b4",
            },
        )
