"""Task helper tests"""
# pylint: disable=redefined-outer-name
import pytest

from open_discussions.features import INDEX_UPDATES
from channels.constants import (
    POST_TYPE,
    COMMENT_TYPE,
    VoteActions,
)
from search.task_helpers import (
    reddit_object_indexer,
    index_new_post,
    index_new_comment,
    update_post_text,
    update_comment_text,
    update_post_removal_status,
    update_field_for_all_post_comments,
    update_comment_removal_status,
    increment_parent_post_comment_count,
    decrement_parent_post_comment_count,
    set_comment_to_deleted,
    update_indexed_score,
)
from search.api import gen_post_id, gen_comment_id


@pytest.fixture(autouse=True)
def enable_index_update_feature(settings):
    """Enables the INDEX_UPDATES feature by default"""
    settings.FEATURES[INDEX_UPDATES] = True


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


def test_index_new_post(mocker, reddit_submission_obj):
    """
    Test that index_new_post calls the indexing task with the right parameters
    """
    fake_serialized_data = {'serialized': 'post'}
    patched_serialize_func = mocker.patch(
        'search.task_helpers.ESPostSerializer.serialize',
        return_value=fake_serialized_data
    )
    patched_task = mocker.patch('search.task_helpers.create_document')
    index_new_post(reddit_submission_obj)
    patched_serialize_func.assert_called_once_with(reddit_submission_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_submission_obj.id),
        fake_serialized_data
    )


def test_index_new_comment(mocker, reddit_comment_obj):
    """
    Test that index_new_comment calls indexing tasks with the right parameters
    """
    fake_serialized_data = {'serialized': 'comment'}
    patched_serialize_func = mocker.patch(
        'search.task_helpers.ESCommentSerializer.serialize',
        return_value=fake_serialized_data
    )
    patched_create_task = mocker.patch('search.task_helpers.create_document')
    patched_increment_task = mocker.patch('search.task_helpers.increment_document_integer_field')
    index_new_comment(reddit_comment_obj)
    patched_serialize_func.assert_called_once_with(reddit_comment_obj)
    assert patched_create_task.delay.called is True
    assert patched_create_task.delay.call_args[0] == (
        gen_comment_id(reddit_comment_obj.id),
        fake_serialized_data
    )
    assert patched_increment_task.delay.called is True
    assert patched_increment_task.delay.call_args[0] == (gen_post_id(reddit_comment_obj.submission.id),)
    assert patched_increment_task.delay.call_args[1] == {
        'field_name': 'num_comments',
        'incr_amount': 1
    }


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


def test_update_comment_text(mocker, reddit_comment_obj):
    """
    Test that update_post_text calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.update_document_with_partial')
    update_comment_text(reddit_comment_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_comment_id(reddit_comment_obj.id),
        {'text': reddit_comment_obj.body}
    )


@pytest.mark.parametrize('removal_status,expected_removed_arg', [
    (True, True),
    (False, False),
])
def test_update_post_removal_status(mocker, reddit_submission_obj, removal_status, expected_removed_arg):
    """
    Test that update_post_removal_status calls the indexing task with the right parameters and
    calls an additional task to update child comment removal status
    """
    patched_task = mocker.patch('search.task_helpers.update_document_with_partial')
    patched_comment_update_func = mocker.patch('search.task_helpers.update_field_for_all_post_comments')
    patched_reddit_object_removed = mocker.patch('search.task_helpers.is_reddit_object_removed')
    patched_reddit_object_removed.return_value = removal_status
    update_post_removal_status(reddit_submission_obj)
    assert patched_reddit_object_removed.called is True
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_submission_obj.id),
        {'removed': expected_removed_arg}
    )
    patched_comment_update_func.assert_called_with(
        reddit_submission_obj,
        field_name='parent_post_removed',
        field_value=expected_removed_arg
    )


@pytest.mark.parametrize('removal_status,expected_removed_arg', [
    (True, True),
    (False, False),
])
def test_update_comment_removal_status(mocker, reddit_comment_obj, removal_status, expected_removed_arg):
    """
    Test that update_comment_removal_status calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.update_document_with_partial')
    patched_reddit_object_removed = mocker.patch('search.task_helpers.is_reddit_object_removed')
    patched_reddit_object_removed.return_value = removal_status
    update_comment_removal_status(reddit_comment_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_comment_id(reddit_comment_obj.id),
        {'removed': expected_removed_arg}
    )


def test_update_post_removal_for_comments(mocker, reddit_submission_obj):
    """
    Test that update_post_removal_for_comments calls the indexing task with the right parameters
    """
    patched_task = mocker.patch('search.task_helpers.update_field_values_by_query')
    field_name, field_value = ('field1', 'value1')
    update_field_for_all_post_comments(reddit_submission_obj, field_name=field_name, field_value=field_value)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[1] == dict(
        query={
            "query": {
                "bool": {
                    "must": [
                        {"match": {"object_type": COMMENT_TYPE}},
                        {"match": {"post_id": reddit_submission_obj.id}}
                    ]
                }
            }
        },
        field_name=field_name,
        field_value=field_value
    )


@pytest.mark.parametrize('update_comment_count_func,expected_increment', [
    (increment_parent_post_comment_count, 1),
    (decrement_parent_post_comment_count, -1),
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


def test_set_comment_to_deleted(mocker, reddit_comment_obj):
    """
    Test that set_comment_to_deleted calls the indexing task to update a comment's deleted property
    and calls another task to decrement the parent post's comment count
    """
    patched_partial_update_task = mocker.patch('search.task_helpers.update_document_with_partial')
    patched_increment_task = mocker.patch('search.task_helpers.increment_document_integer_field')
    set_comment_to_deleted(reddit_comment_obj)
    assert patched_partial_update_task.delay.called is True
    assert patched_partial_update_task.delay.call_args[0] == (
        gen_comment_id(reddit_comment_obj.id),
        {'deleted': True}
    )
    assert patched_increment_task.delay.called is True
    assert patched_increment_task.delay.call_args[0] == (gen_post_id(reddit_comment_obj.submission.id),)
    assert patched_increment_task.delay.call_args[1] == {
        'field_name': 'num_comments',
        'incr_amount': -1
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
