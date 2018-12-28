"""
Tests for serializers for comment REST APIS
"""
from unittest.mock import Mock

import pytest
from rest_framework.exceptions import ValidationError

from channels.serializers.comments import CommentSerializer


def test_comment_update_with_comment_id():
    """Cannot pass comment_id to a comment, this is provided in the URL"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().update(Mock(), {"comment_id": "something"})
    assert ex.value.args[0] == "comment_id must be provided via URL"


def test_comment_validate_upvoted():
    """upvoted must be a bool"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().validate_upvoted("not a bool")
    assert ex.value.args[0] == "upvoted must be a bool"


def test_comment_validate_downvoted():
    """downvoted must be a bool"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().validate_downvoted("not a bool")
    assert ex.value.args[0] == "downvoted must be a bool"


def test_comment_only_one_downvote_or_upvote():
    """only one of downvoted or upvoted can be true at the same time"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().validate({"upvoted": True, "downvoted": True})
    assert ex.value.args[0] == "upvoted and downvoted cannot both be true"


def test_comment_validate_removed():
    """removed must be a bool"""
    with pytest.raises(ValidationError) as ex:
        CommentSerializer().validate_removed("not a bool")
    assert ex.value.args[0] == "removed must be a bool"
