"""Tests for elasticsearch serializers"""
import pytest

from channels.constants import (
    COMMENT_TYPE,
    POST_TYPE,
)
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
