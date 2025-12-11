"""Tests for URLs"""
import pytest
from django.urls import reverse


def test_index():
    """Test that the index URL is set correctly"""
    assert reverse("open_discussions-index") == "/"


# Tests for channel-post and channel-post-comment URLs removed - discussions removed
