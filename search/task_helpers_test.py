"""Task helper tests"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace
import pytest

from open_discussions.features import INDEX_UPDATES
from channels.constants import (
    POST_TYPE,
    VoteActions,
)
from search.task_helpers import (
    reddit_object_indexer,
    index_full_post,
    update_post_text,
    update_post_removal_status,
    increment_post_comment_count,
    decrement_post_comment_count,
    update_indexed_score,
)
from search.indexing_api import gen_post_id


@pytest.fixture(autouse=True)
def enable_index_update_feature(settings):
    """Enables the INDEX_UPDATES feature by default"""
    settings.FEATURES[INDEX_UPDATES] = True


@pytest.fixture()
def reddit_submission_obj():  # pylint: disable=missing-docstring
    return SimpleNamespace(
        author=SimpleNamespace(name='Test User'),
        subreddit=SimpleNamespace(display_name='channel_1'),
        selftext='Body text',
        score=1,
        created=12345,
        id='a',
        title='Post Title',
        num_comments=1
    )


@pytest.fixture()
def reddit_comment_obj():  # pylint: disable=missing-docstring
    return SimpleNamespace(
        submission=SimpleNamespace(id=1)
    )


def test_reddit_object_indexer(mocker):
    """
    Test that a function decorated with reddit_object_indexer receives the return value
    of the decorated function, passes it to a provided function, and returns the value
    as normal.
    """
    def mock_indexer(reddit_obj):  # pylint: disable=missing-docstring
        reddit_obj.changed = True

    @reddit_object_indexer(indexing_func=mock_indexer)
    def decorated_api_func(mock_reddit_obj):  # pylint: disable=missing-docstring
        return mock_reddit_obj

    mock_reddit_obj = mocker.Mock()
    reddit_obj = decorated_api_func(mock_reddit_obj)
    assert reddit_obj.changed is True
    assert reddit_obj == mock_reddit_obj


def test_index_full_post(mocker, reddit_submission_obj):
    """
    Test that index_full_post calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.create_document')
    index_full_post(reddit_submission_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_submission_obj.id),
        {
            'object_type': POST_TYPE,
            'post_id': reddit_submission_obj.id,
            'author': reddit_submission_obj.author.name,
            'channel_title': reddit_submission_obj.subreddit.display_name,
            'text': reddit_submission_obj.selftext,
            'score': reddit_submission_obj.score,
            'created': reddit_submission_obj.created,
            'post_title': reddit_submission_obj.title,
            'num_comments': reddit_submission_obj.num_comments,
        }
    )


def test_update_post_text(mocker, reddit_submission_obj):
    """
    Test that update_post_text calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.update_document_with_partial')
    update_post_text(reddit_submission_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_submission_obj.id),
        {'text': reddit_submission_obj.selftext}
    )


@pytest.mark.parametrize('banned_by,approved_by,expected_removed', [
    ('some_username', None, True),
    (None, 'some_username', False),
    ('some_username', 'some_username', False),
])
def test_update_post_removal_status(mocker, reddit_submission_obj, banned_by, approved_by, expected_removed):
    """
    Test that update_post_removal_status calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.update_document_with_partial')
    reddit_submission_obj.banned_by = banned_by
    reddit_submission_obj.approved_by = approved_by
    update_post_removal_status(reddit_submission_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_submission_obj.id),
        {'removed': expected_removed}
    )


@pytest.mark.parametrize('update_comment_count_func,expected_increment', [
    (increment_post_comment_count, 1),
    (decrement_post_comment_count, -1),
])
def test_update_post_comment_count(mocker, reddit_comment_obj, update_comment_count_func, expected_increment):
    """
    Test that update_post_removal_status calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.increment_document_integer_field')
    update_comment_count_func(reddit_comment_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (gen_post_id(reddit_comment_obj.submission.id), )
    assert patched_task.delay.call_args[1] == {
        'field_name': 'num_comments',
        'incr_amount': expected_increment
    }


@pytest.mark.parametrize('vote_action,expected_increment', [
    (VoteActions.UPVOTE, 1),
    (VoteActions.CLEAR_DOWNVOTE, 1),
    (VoteActions.DOWNVOTE, -1),
    (VoteActions.CLEAR_UPVOTE, -1),
])
def test_update_indexed_score(mocker, reddit_submission_obj, vote_action, expected_increment):
    """
    Test that update_indexed_score calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.increment_document_integer_field')
    update_indexed_score(reddit_submission_obj, POST_TYPE, vote_action=vote_action)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (gen_post_id(reddit_submission_obj.id), )
    assert patched_task.delay.call_args[1] == {
        'field_name': 'score',
        'incr_amount': expected_increment
    }
