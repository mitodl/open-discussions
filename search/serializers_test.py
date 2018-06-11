"""Tests for elasticsearch serializers"""
# pylint: disable=redefined-outer-name
import pytest

from channels.constants import (
    POST_TYPE,
    COMMENT_TYPE,
)
from search.serializers import (
    serialize_comment,
    serialize_post,
    serialize_bulk_post_and_comments,
    serialize_post_for_bulk,
    serialize_comment_for_bulk,
)


def test_serialize_bulk_post_and_comments(mocker):
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
    assert list(serialize_bulk_post_and_comments(post_mock)) == [
        serialize_post_for_bulk(post_mock),
        serialize_comment_for_bulk(outer_comment_mock),
        serialize_comment_for_bulk(inner_comment_mock),
    ]


@pytest.mark.parametrize("missing_author", [True, False])
def test_serialize_comment(mocker, missing_author):
    """serialize_comment should create a dict representation of a reddit comment to put in elasticsearch"""
    author_name = 'author'
    channel = 'channel'
    comment_id = 'comment'
    created = 'created'
    parent = 'parent'
    post_id = 'post id'
    post_title = 'post title'
    score = 'score'
    text = 'text'

    if missing_author:
        author_obj = None
    else:
        author_obj = mocker.Mock()
        author_obj.name = author_name

    comment = mocker.Mock(
        author=author_obj,
        subreddit=mocker.Mock(display_name=channel),
        id=comment_id,
        created=created,
        submission=mocker.Mock(id=post_id, title=post_title),
        score=score,
        body=text,
    )
    comment.parent = mocker.Mock(return_value=mocker.Mock(id=parent))
    assert serialize_comment(comment) == {
        'author': author_name if not missing_author else None,
        'channel_title': channel,
        'comment_id': comment_id,
        'created': created,
        'object_type': COMMENT_TYPE,
        'parent_comment_id': parent,
        'post_id': post_id,
        'post_title': post_title,
        'score': score,
        'text': text,
    }


@pytest.mark.parametrize("missing_author", [True, False])
def test_serialize_post(mocker, missing_author):
    """serialize_post should create a dict representation of a post to put in elasticsearch"""
    author_name = 'author_name'
    channel_name = 'channel'
    created = 'created'
    num_comments = 'comments'
    text = 'selftext'
    score = 'score'
    post_id = 'post_id'
    post_title = 'post_title'

    if missing_author:
        author_obj = None
    else:
        author_obj = mocker.Mock()
        author_obj.name = author_name

    post = mocker.Mock(
        author=author_obj,
        subreddit=mocker.Mock(display_name=channel_name),
        created=created,
        num_comments=num_comments,
        selftext=text,
        score=score,
        title=post_title,
        id=post_id,
    )
    assert serialize_post(post) == {
        'author': author_name if not missing_author else None,
        'channel_title': channel_name,
        'created': created,
        'num_comments': num_comments,
        'object_type': POST_TYPE,
        'post_id': post_id,
        'post_title': post_title,
        'score': score,
        'text': text,
    }


def test_serialize_post_for_bulk(mocker, reddit_submission_obj):
    """
    Test that serialize_post_for_bulk correctly serializes a post/submission object
    """
    post_id = 'post1'
    base_serialized_post = {'serialized': 'post'}
    mocker.patch('search.serializers.serialize_post', return_value=base_serialized_post)
    mocker.patch('search.serializers.gen_post_id', return_value=post_id)
    serialized = serialize_post_for_bulk(reddit_submission_obj)
    assert serialized == {
        '_id': post_id,
        **base_serialized_post,
    }


def test_serialize_comment_for_bulk(mocker, reddit_comment_obj):
    """
    Test that serialize_comment_for_bulk correctly serializes a comment object
    """
    comment_id = 'comment1'
    base_serialized_comment = {'serialized': 'comment'}
    mocker.patch('search.serializers.serialize_comment', return_value=base_serialized_comment)
    mocker.patch('search.serializers.gen_comment_id', return_value=comment_id)
    serialized = serialize_comment_for_bulk(reddit_comment_obj)
    assert serialized == {
        '_id': comment_id,
        **base_serialized_comment,
    }
