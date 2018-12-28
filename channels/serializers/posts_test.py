"""
Tests for serializers for channel REST APIS
"""
from unittest.mock import Mock

import pytest
from rest_framework.exceptions import ValidationError

from channels.serializers.posts import PostSerializer


pytestmark = pytest.mark.django_db


def test_post_validate_upvoted():
    """upvoted must be a bool"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_upvoted("not a bool")
    assert ex.value.args[0] == "upvoted must be a bool"


def test_post_validate_text():
    """text must be a string"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_text(["not a string"])
    assert ex.value.args[0] == "text must be a string"


def test_post_validate_url():
    """url must be a string"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_url(["not a string"])
    assert ex.value.args[0] == "url must be a string"


def test_post_both_text_and_url():
    """We can't create a post with both text and url specified"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().create({"title": "title", "text": "text", "url": "url"})
    assert (
        ex.value.args[0]
        == "Only one of text, article_content, or url can be used to create a post"
    )


def test_post_edit_url():
    """Cannot update the URL for a post"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer(
            context={"request": Mock(), "view": Mock(kwargs={"post_id": "post"})}
        ).update(Mock(), {"url": "url"})
    assert ex.value.args[0] == "Cannot edit url for a post"


def test_post_validate_removed():
    """removed must be a bool"""
    with pytest.raises(ValidationError) as ex:
        PostSerializer().validate_removed("not a bool")
    assert ex.value.args[0] == "removed must be a bool"
