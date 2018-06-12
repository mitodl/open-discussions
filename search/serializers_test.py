"""Tests for elasticsearch serializers"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace
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


@pytest.fixture
def fake_db_user(mocker):
    """Fixture that patches the function to fetch a user from the database"""
    author_name = "Test User"
    patched_getter = mocker.patch(
        'search.serializers._get_user_from_reddit_object',
        return_value=SimpleNamespace(profile=SimpleNamespace(name=author_name))
    )
    return SimpleNamespace(
        name=author_name,
        patched_getter=patched_getter
    )


def test_serialize_bulk_post_and_comments(mocker):
    """index_comments should index comments and then call itself recursively to index more comments"""
    mocker.patch('search.serializers._get_user_from_reddit_object')
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


def test_serialize_post(reddit_submission_obj, fake_db_user):
    """
    Test that serialize_post correctly serializes a post/submission object
    """
    serialized = serialize_post(reddit_submission_obj)
    fake_db_user.patched_getter.assert_called_once_with(reddit_submission_obj)
    assert serialized == {
        'object_type': POST_TYPE,
        'author_id': reddit_submission_obj.author.name,
        'author_name': fake_db_user.name,
        'channel_title': reddit_submission_obj.subreddit.display_name,
        'text': reddit_submission_obj.selftext,
        'score': reddit_submission_obj.score,
        'created': reddit_submission_obj.created,
        'post_id': reddit_submission_obj.id,
        'post_title': reddit_submission_obj.title,
        'num_comments': reddit_submission_obj.num_comments,
    }


# pylint: disable=too-many-arguments
@pytest.mark.parametrize('parent_type,parent_id,expected_parent_comment_id', [
    (COMMENT_TYPE, 1, 1),
    (POST_TYPE, 1, None),
])
def test_serialize_comment(
        mocker, reddit_comment_obj, fake_db_user, parent_type, parent_id, expected_parent_comment_id
):
    """
    Test that serialize_comment correctly serializes a comment object
    """
    patched_type_func = mocker.patch('search.serializers.get_reddit_object_type', return_value=parent_type)
    mock_parent_obj = mocker.Mock(id=parent_id)
    reddit_comment_obj.parent.return_value = mock_parent_obj
    serialized = serialize_comment(reddit_comment_obj)
    fake_db_user.patched_getter.assert_called_once_with(reddit_comment_obj)
    patched_type_func.assert_called_once()
    assert serialized == {
        'object_type': COMMENT_TYPE,
        'author_id': reddit_comment_obj.author.name,
        'author_name': fake_db_user.name,
        'channel_title': reddit_comment_obj.subreddit.display_name,
        'text': reddit_comment_obj.body,
        'score': reddit_comment_obj.score,
        'created': reddit_comment_obj.created,
        'post_id': reddit_comment_obj.submission.id,
        'post_title': reddit_comment_obj.submission.title,
        'comment_id': reddit_comment_obj.id,
        'parent_comment_id': expected_parent_comment_id,
    }


def test_serialize_missing_author(reddit_submission_obj, reddit_comment_obj):
    """Test that objects with missing author information can still be serialized"""
    reddit_submission_obj.author = None
    reddit_comment_obj.author = None
    serialized_post = serialize_post(reddit_submission_obj)
    serialized_comment = serialize_comment(reddit_comment_obj)
    assert serialized_post['author_id'] is None
    assert serialized_post['author_name'] is None
    assert serialized_comment['author_id'] is None
    assert serialized_comment['author_name'] is None


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
