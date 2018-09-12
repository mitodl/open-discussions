"""Tests for elasticsearch serializers"""
# pylint: disable=redefined-outer-name,unused-argument
import pytest

from channels.constants import (
    POST_TYPE,
    COMMENT_TYPE,
)
from search.serializers import (
    ESPostSerializer,
    ESCommentSerializer,
    serialize_bulk_post_and_comments,
    serialize_post_for_bulk,
    serialize_comment_for_bulk,
)


@pytest.fixture
def patched_base_post_serializer(mocker):
    """Fixture that patches the base serializer class for ESPostSerializer"""
    base_serialized_data = {
        'author_id': 1,
        'author_name': 'Author Name',
        'channel_title': 'channel_1',
        'text': 'Post Text',
        'score': 1,
        'created': 123,
        'num_comments': 0,
        'removed': False,
        'deleted': False,
        'id': 1,
        'title': 'post_title',
        'url': None,
        'thumbnail': None
    }
    yield mocker.patch(
        'search.serializers.ESPostSerializer.base_serializer',
        return_value=mocker.Mock(data=base_serialized_data, _get_user=mocker.Mock()))


@pytest.fixture
def patched_base_comment_serializer(mocker):
    """Fixture that patches the base serializer class for ESCommentSerializer"""
    base_serialized_data = {
        'author_id': 1,
        'author_name': 'Author Name',
        'text': 'Comment Text',
        'score': 1,
        'created': 456,
        'removed': False,
        'deleted': False,
        'id': 1,
        'parent_id': 2
    }
    yield mocker.patch(
        'search.serializers.ESCommentSerializer.base_serializer',
        return_value=mocker.Mock(data=base_serialized_data, _get_user=mocker.Mock()))


@pytest.mark.parametrize("post_text,post_url", [["some text", None], ["", "http://example.com"]])
def test_es_post_serializer(patched_base_post_serializer, reddit_submission_obj, post_text, post_url):
    """
    Test that ESPostSerializer correctly serializes a post/submission object
    """
    patched_base_post_serializer.return_value.data.update({
        'text': post_text,
        'url': post_url,
    })
    base_serialized = patched_base_post_serializer.return_value.data
    serialized = ESPostSerializer().serialize(reddit_submission_obj)
    patched_base_post_serializer.assert_called_once_with(reddit_submission_obj)
    assert serialized == {
        'object_type': POST_TYPE,
        'author_id': base_serialized['author_id'],
        'author_name': base_serialized['author_name'],
        'channel_title': base_serialized['channel_title'],
        'text': base_serialized['text'],
        'score': base_serialized['score'],
        'removed': base_serialized['removed'],
        'created': base_serialized['created'],
        'deleted': base_serialized['deleted'],
        'num_comments': base_serialized['num_comments'],
        'post_id': base_serialized['id'],
        'post_title': base_serialized['title'],
        'post_link_url': base_serialized['url'],
        'post_link_thumbnail': base_serialized['thumbnail'],
    }


def test_es_comment_serializer(patched_base_comment_serializer, reddit_comment_obj):
    """
    Test that ESCommentSerializer correctly serializes a comment object
    """
    base_serialized = patched_base_comment_serializer.return_value.data
    serialized = ESCommentSerializer().serialize(reddit_comment_obj)
    patched_base_comment_serializer.assert_called_once_with(reddit_comment_obj)
    assert serialized == {
        'object_type': COMMENT_TYPE,
        'author_id': base_serialized['author_id'],
        'author_name': base_serialized['author_name'],
        'text': base_serialized['text'],
        'score': base_serialized['score'],
        'created': base_serialized['created'],
        'removed': base_serialized['removed'],
        'deleted': base_serialized['deleted'],
        'comment_id': base_serialized['id'],
        'parent_comment_id': base_serialized['parent_id'],
        'channel_title': reddit_comment_obj.subreddit.display_name,
        'post_id': reddit_comment_obj.submission.id,
        'post_title': reddit_comment_obj.submission.title,
    }


def test_serialize_bulk_post_and_comments(mocker, patched_base_post_serializer, patched_base_comment_serializer):
    """index_comments should index comments and then call itself recursively to index more comments"""
    inner_comment_mock = mocker.Mock(
        id='comment_2',
        replies=[],
    )
    outer_comment_mock = mocker.Mock(id='comment_1', replies=[inner_comment_mock])
    post_mock = mocker.MagicMock(comments=[outer_comment_mock])
    assert list(serialize_bulk_post_and_comments(post_mock)) == [
        serialize_post_for_bulk(post_mock),
        serialize_comment_for_bulk(outer_comment_mock),
        serialize_comment_for_bulk(inner_comment_mock),
    ]


def test_serialize_post_for_bulk(mocker, reddit_submission_obj):
    """
    Test that serialize_post_for_bulk correctly serializes a post/submission object
    """
    post_id = 'post1'
    base_serialized_post = {'serialized': 'post'}
    mocker.patch('search.serializers.ESPostSerializer.serialize', return_value=base_serialized_post)
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
    mocker.patch('search.serializers.ESCommentSerializer.serialize', return_value=base_serialized_comment)
    mocker.patch('search.serializers.gen_comment_id', return_value=comment_id)
    serialized = serialize_comment_for_bulk(reddit_comment_obj)
    assert serialized == {
        '_id': comment_id,
        **base_serialized_comment,
    }


def test_serialize_missing_author(patched_base_post_serializer, patched_base_comment_serializer, reddit_submission_obj,
                                  reddit_comment_obj):
    """Test that objects with missing author information can still be serialized"""
    deleted_author_dict = {
        'author_id': '[deleted]',
        'author_name': '[deleted]',
    }
    patched_base_post_serializer.return_value.data.update(deleted_author_dict)
    patched_base_comment_serializer.return_value.data.update(deleted_author_dict)
    serialized_post = ESPostSerializer().serialize(reddit_submission_obj)
    serialized_comment = ESCommentSerializer().serialize(reddit_comment_obj)
    assert serialized_post['author_id'] is None
    assert serialized_post['author_name'] is None
    assert serialized_comment['author_id'] is None
    assert serialized_comment['author_name'] is None
