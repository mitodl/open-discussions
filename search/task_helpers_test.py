"""Task helper tests"""
# pylint: disable=redefined-outer-name,unused-argument
import pytest

from course_catalog.factories import CourseFactory
from open_discussions.features import INDEX_UPDATES
from channels.constants import POST_TYPE, COMMENT_TYPE, VoteActions
from channels.factories.models import CommentFactory
from channels.utils import render_article_text
from search.constants import PROFILE_TYPE, COURSE_TYPE
from search.serializers import ESCourseSerializer
from search.task_helpers import (
    reddit_object_persist,
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
    index_new_profile,
    update_author,
    update_author_posts_comments,
    update_channel_index,
    update_course,
    index_new_course,
)
from search.api import gen_post_id, gen_comment_id, gen_profile_id, gen_course_id

es_profile_serializer_data = {
    "object_type": PROFILE_TYPE,
    "author_id": "testuser",
    "author_name": "Test User",
    "author_avatar_small": "/media/profiles/testuser/asd344/small.jpg",
    "author_avatar_medium": "/media/profiles/testuser/asd344/medium.jpg",
    "author_bio": "Test bio",
    "author_headline": "Test headline",
    "author_channel_membership": "channel01,channel02",
}


@pytest.fixture(autouse=True)
def enable_index_update_feature(settings):
    """Enables the INDEX_UPDATES feature by default"""
    settings.FEATURES[INDEX_UPDATES] = True


@pytest.fixture()
def mock_es_profile_serializer(mocker):
    """Mock ESProfileSerializer with canned serialized data"""
    mocker.patch(
        "search.task_helpers.ESProfileSerializer.serialize",
        autospec=True,
        return_value=es_profile_serializer_data,
    )


def test_reddit_object_persist(mocker):
    """
    Test that a function decorated with reddit_object_persist receives the return value
    of the decorated function, passes it to a provided function, and returns the value
    as normal.
    """

    def mock_indexer1(reddit_obj):  # pylint: disable=missing-docstring
        reddit_obj.changed1 = True

    def mock_indexer2(reddit_obj):  # pylint: disable=missing-docstring
        reddit_obj.changed2 = True

    @reddit_object_persist(mock_indexer1, mock_indexer2)
    def decorated_api_func(mock_reddit_obj):  # pylint: disable=missing-docstring
        return mock_reddit_obj

    mock_reddit_obj = mocker.Mock()
    reddit_obj = decorated_api_func(mock_reddit_obj)
    assert reddit_obj.changed1 is True
    assert reddit_obj.changed2 is True
    assert reddit_obj == mock_reddit_obj


def test_index_new_post(mocker):
    """
    Test that index_new_post calls the indexing task with the right parameters
    """
    fake_serialized_data = {"serialized": "post"}
    mock_post = mocker.Mock(post_id="abc")
    mock_post_proxy = mocker.Mock(_self_post=mock_post)
    patched_serialize_func = mocker.patch(
        "search.task_helpers.ESPostSerializer.to_representation",
        return_value=fake_serialized_data,
    )
    patched_task = mocker.patch("search.task_helpers.create_post_document")
    index_new_post(mock_post_proxy)
    patched_serialize_func.assert_called_once_with(mock_post)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(mock_post.post_id),
        fake_serialized_data,
    )


@pytest.mark.django_db
def test_index_new_comment(mocker):
    """
    Test that index_new_comment calls indexing tasks with the right parameters
    """
    fake_serialized_data = {"serialized": "comment"}
    # ugly mock hack to avoid the index_new_profile.delay() call in Profile.save() of the comment author
    mocker.patch("search.task_helpers.index_new_profile")
    comment = CommentFactory.create()
    mock_submission = mocker.Mock(id="123")
    mock_comment = mocker.Mock(id=comment.comment_id, submission=mock_submission)
    patched_serialize_func = mocker.patch(
        "search.task_helpers.ESCommentSerializer.to_representation",
        return_value=fake_serialized_data,
    )
    patched_create_task = mocker.patch("search.task_helpers.create_document")
    patched_increment_task = mocker.patch(
        "search.task_helpers.increment_document_integer_field"
    )
    index_new_comment(mock_comment)
    patched_serialize_func.assert_called_once_with(comment)
    assert patched_create_task.delay.called is True
    assert patched_create_task.delay.call_args[0] == (
        gen_comment_id(mock_comment.id),
        fake_serialized_data,
    )
    assert patched_increment_task.delay.called is True
    assert patched_increment_task.delay.call_args[0] == (
        gen_post_id(mock_submission.id),
    )
    assert patched_increment_task.delay.call_args[1] == {
        "field_name": "num_comments",
        "incr_amount": 1,
        "object_type": POST_TYPE,
    }


def test_index_new_profile(mock_index_functions, mocker, user):
    """
    Test that index_new_profile calls indexing tasks with the right parameters
    """
    fake_serialized_data = {"serialized": "profile"}
    patched_create_task = mocker.patch("search.task_helpers.create_document")
    patched_serialize_func = mocker.patch(
        "search.task_helpers.ESProfileSerializer.serialize",
        return_value=fake_serialized_data,
    )
    index_new_profile(user.profile)
    patched_serialize_func.assert_called_once_with(user.profile)
    assert patched_create_task.delay.called is True
    assert patched_create_task.delay.call_args[0] == (
        gen_profile_id(user.username),
        fake_serialized_data,
    )


def test_update_post_text(mocker, reddit_submission_obj):
    """
    Test that update_post_text calls the indexing task with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_document_with_partial")
    update_post_text(reddit_submission_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_submission_obj.id),
        {
            "text": reddit_submission_obj.selftext,
            "plain_text": render_article_text(reddit_submission_obj.article_content),
        },
        POST_TYPE,
    )


def test_update_comment_text(mocker, reddit_comment_obj):
    """
    Test that update_post_text calls the indexing task with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_document_with_partial")
    update_comment_text(reddit_comment_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_comment_id(reddit_comment_obj.id),
        {"text": reddit_comment_obj.body},
        COMMENT_TYPE,
    )


@pytest.mark.parametrize(
    "removal_status,expected_removed_arg", [(True, True), (False, False)]
)
def test_update_post_removal_status(
    mocker, reddit_submission_obj, removal_status, expected_removed_arg
):
    """
    Test that update_post_removal_status calls the indexing task with the right parameters and
    calls an additional task to update child comment removal status
    """
    patched_task = mocker.patch("search.task_helpers.update_document_with_partial")
    patched_comment_update_func = mocker.patch(
        "search.task_helpers.update_field_for_all_post_comments"
    )
    patched_reddit_object_removed = mocker.patch(
        "search.task_helpers.is_reddit_object_removed"
    )
    patched_reddit_object_removed.return_value = removal_status
    update_post_removal_status(reddit_submission_obj)
    assert patched_reddit_object_removed.called is True
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_submission_obj.id),
        {"removed": expected_removed_arg},
        POST_TYPE,
    )
    patched_comment_update_func.assert_called_with(
        reddit_submission_obj,
        field_name="parent_post_removed",
        field_value=expected_removed_arg,
    )


@pytest.mark.parametrize(
    "removal_status,expected_removed_arg", [(True, True), (False, False)]
)
def test_update_comment_removal_status(
    mocker, reddit_comment_obj, removal_status, expected_removed_arg
):
    """
    Test that update_comment_removal_status calls the indexing task with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_document_with_partial")
    patched_reddit_object_removed = mocker.patch(
        "search.task_helpers.is_reddit_object_removed"
    )
    patched_reddit_object_removed.return_value = removal_status
    update_comment_removal_status(reddit_comment_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_comment_id(reddit_comment_obj.id),
        {"removed": expected_removed_arg},
        COMMENT_TYPE,
    )


def test_update_post_removal_for_comments(mocker, reddit_submission_obj):
    """
    Test that update_post_removal_for_comments calls the indexing task with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_field_values_by_query")
    field_name, field_value = ("field1", "value1")
    update_field_for_all_post_comments(
        reddit_submission_obj, field_name=field_name, field_value=field_value
    )
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[1] == dict(
        query={
            "query": {
                "bool": {
                    "must": [
                        {"match": {"object_type": COMMENT_TYPE}},
                        {"match": {"post_id": reddit_submission_obj.id}},
                    ]
                }
            }
        },
        field_dict={field_name: field_value},
        object_types=[COMMENT_TYPE],
    )


@pytest.mark.parametrize(
    "update_comment_count_func,expected_increment",
    [
        (increment_parent_post_comment_count, 1),
        (decrement_parent_post_comment_count, -1),
    ],
)
def test_update_post_comment_count(
    mocker, reddit_comment_obj, update_comment_count_func, expected_increment
):
    """
    Test that update_post_removal_status calls the indexing task with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.increment_document_integer_field")
    update_comment_count_func(reddit_comment_obj)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (
        gen_post_id(reddit_comment_obj.submission.id),
    )
    assert patched_task.delay.call_args[1] == {
        "field_name": "num_comments",
        "incr_amount": expected_increment,
        "object_type": POST_TYPE,
    }


def test_set_comment_to_deleted(mocker, reddit_comment_obj):
    """
    Test that set_comment_to_deleted calls the indexing task to update a comment's deleted property
    and calls another task to decrement the parent post's comment count
    """
    patched_partial_update_task = mocker.patch(
        "search.task_helpers.update_document_with_partial"
    )
    patched_increment_task = mocker.patch(
        "search.task_helpers.increment_document_integer_field"
    )
    set_comment_to_deleted(reddit_comment_obj)
    assert patched_partial_update_task.delay.called is True
    assert patched_partial_update_task.delay.call_args[0] == (
        gen_comment_id(reddit_comment_obj.id),
        {"deleted": True},
        COMMENT_TYPE,
    )
    assert patched_increment_task.delay.called is True
    assert patched_increment_task.delay.call_args[0] == (
        gen_post_id(reddit_comment_obj.submission.id),
    )
    assert patched_increment_task.delay.call_args[1] == {
        "field_name": "num_comments",
        "incr_amount": -1,
        "object_type": POST_TYPE,
    }


@pytest.mark.parametrize(
    "vote_action,expected_increment",
    [
        (VoteActions.UPVOTE, 1),
        (VoteActions.CLEAR_DOWNVOTE, 1),
        (VoteActions.DOWNVOTE, -1),
        (VoteActions.CLEAR_UPVOTE, -1),
    ],
)
def test_update_indexed_score(
    mocker, reddit_submission_obj, vote_action, expected_increment
):
    """
    Test that update_indexed_score calls the indexing task with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.increment_document_integer_field")
    update_indexed_score(reddit_submission_obj, POST_TYPE, vote_action=vote_action)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[0] == (gen_post_id(reddit_submission_obj.id),)
    assert patched_task.delay.call_args[1] == {
        "field_name": "score",
        "incr_amount": expected_increment,
        "object_type": POST_TYPE,
    }


def test_update_author(mocker, mock_index_functions, mock_es_profile_serializer, user):
    """
    Tests that update_author calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_document_with_partial")
    call_data = es_profile_serializer_data
    call_data.pop("author_id")
    update_author(user)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[1] == dict(retry_on_conflict=1)
    assert patched_task.delay.call_args[0] == (
        gen_profile_id(user.username),
        call_data,
        "profile",
    )


def test_update_indexing_author(mocker, mock_index_functions, index_user, settings):
    """
    Tests that update_author does not call update_field_values_by_query for the indexing user
    """
    settings.INDEXING_API_USERNAME = index_user.username
    patched_task = mocker.patch("search.task_helpers.update_field_values_by_query")
    update_author(index_user)
    assert patched_task.delay.called is False


def test_update_author_posts_comments(
    mocker, mock_index_functions, mock_es_profile_serializer, user
):
    """
    Tests that update_author_posts_comments calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_field_values_by_query")
    call_data = {
        key: val
        for key, val in es_profile_serializer_data.items()
        if key in {"author_name", "author_avatar_small", "author_headline"}
    }
    update_author_posts_comments(user.profile)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[1] == dict(
        query={"query": {"bool": {"must": [{"match": {"author_id": user.username}}]}}},
        field_dict=call_data,
        object_types=[POST_TYPE, COMMENT_TYPE],
    )


def test_update_channel_index(mocker, mock_index_functions):
    """
    Tests that update_channel_index calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_field_values_by_query")
    channel = mocker.Mock(
        display_name="name",
        title="title",
        subreddit_type="public",
        description="description",
        public_description="public_description",
        submission_type="link",
    )
    update_channel_index(channel)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[1] == dict(
        query={
            "query": {
                "bool": {"must": [{"match": {"channel_name": channel.display_name}}]}
            }
        },
        field_dict={
            "channel_title": channel.title,
            "channel_type": channel.subreddit_type,
        },
        object_types=[COMMENT_TYPE, POST_TYPE],
    )


@pytest.mark.django_db
def test_update_course(mock_index_functions, mocker):
    """
    Tests that update_course calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.update_document_with_partial")
    course = CourseFactory.create()
    update_course(course)
    assert patched_task.delay.called is True
    assert patched_task.delay.call_args[1] == dict(retry_on_conflict=1)
    assert patched_task.delay.call_args[0] == (
        gen_course_id(course.course_id),
        ESCourseSerializer(course).data,
        COURSE_TYPE,
    )


@pytest.mark.django_db
def test_index_new_course(mock_index_functions, mocker):
    """
    Test that index_new_course calls indexing tasks with the right parameters
    """
    patched_create_task = mocker.patch("search.task_helpers.create_document")
    course = CourseFactory.create()
    index_new_course(course)
    assert patched_create_task.delay.called is True
    assert patched_create_task.delay.call_args[0] == (
        gen_course_id(course.course_id),
        ESCourseSerializer(course).data,
    )
