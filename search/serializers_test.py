"""Tests for elasticsearch serializers"""
from search.serializers import (
    serialize_comment,
    serialize_post,
    serialize_post_and_comments,
)


def test_serialize_post_and_comments(mocker):
    """index_comments should index comments and then call itself recursively to index more comments"""
    inner_comment_mock = mocker.Mock(
        id='comment_2',
        replies=[],
    )
    outer_comment_mock = mocker.Mock(
        id='comment_1',
        replies=[inner_comment_mock]
    )
    post_mock = mocker.MagicMock(comments=[outer_comment_mock])
    assert list(serialize_post_and_comments(post_mock)) == [
        serialize_post(post_mock),
        serialize_comment(outer_comment_mock),
        serialize_comment(inner_comment_mock),
    ]
