"""Task helper tests"""
# pylint: disable=redefined-outer-name,unused-argument
import pytest

from channels.constants import COMMENT_TYPE, POST_TYPE, VoteActions
from channels.factories.models import CommentFactory
from channels.utils import render_article_text
from course_catalog.constants import UserListType
from course_catalog.factories import (
    ContentFileFactory,
    CourseFactory,
    PodcastEpisodeFactory,
    PodcastFactory,
    ProgramFactory,
    UserListFactory,
    VideoFactory,
)
from open_discussions.features import INDEX_UPDATES
from search.api import (
    gen_comment_id,
    gen_course_id,
    gen_podcast_episode_id,
    gen_podcast_id,
    gen_post_id,
    gen_profile_id,
    gen_user_list_id,
    gen_video_id,
)
from search.constants import (
    COURSE_TYPE,
    PODCAST_EPISODE_TYPE,
    PODCAST_TYPE,
    PROFILE_TYPE,
    USER_LIST_TYPE,
    VIDEO_TYPE,
)
from search.task_helpers import (
    decrement_parent_post_comment_count,
    deindex_course,
    deindex_podcast,
    deindex_podcast_episode,
    deindex_profile,
    deindex_run_content_files,
    deindex_user_list,
    deindex_video,
    increment_parent_post_comment_count,
    index_new_comment,
    index_new_post,
    index_run_content_files,
    reddit_object_persist,
    set_comment_to_deleted,
    update_author_posts_comments,
    update_channel_index,
    update_comment_removal_status,
    update_comment_text,
    update_field_for_all_post_comments,
    update_indexed_score,
    update_post_removal_status,
    update_post_text,
    upsert_content_file,
    upsert_course,
    upsert_podcast,
    upsert_podcast_episode,
    upsert_profile,
    upsert_program,
    upsert_user_list,
    upsert_video,
)

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
    """Mock OSProfileSerializer with canned serialized data"""
    mocker.patch(
        "search.tasks.OSProfileSerializer.serialize",
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
        "search.task_helpers.OSPostSerializer.to_representation",
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
    comment = CommentFactory.create()
    mock_submission = mocker.Mock(id="123")
    mock_comment = mocker.Mock(id=comment.comment_id, submission=mock_submission)
    patched_serialize_func = mocker.patch(
        "search.task_helpers.OSCommentSerializer.to_representation",
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


def test_upsert_profile(mocker, mock_es_profile_serializer, user):
    """
    Tests that upsert_profile calls the task with the right parameters
    """
    patched_task = mocker.patch("search.task_helpers.tasks.upsert_profile")
    upsert_profile(user.profile.id)
    patched_task.delay.assert_called_once_with(user.profile.id)


def test_update_author_posts_comments(mocker, mock_es_profile_serializer, user):
    """
    Tests that update_author_posts_comments calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.indexing_api.update_field_values_by_query")
    call_data = {
        key: val
        for key, val in es_profile_serializer_data.items()
        if key in {"author_name", "author_avatar_small", "author_headline"}
    }
    update_author_posts_comments(user.profile.id)
    patched_task.assert_called_once_with(
        query={"query": {"bool": {"must": [{"match": {"author_id": user.username}}]}}},
        field_dict=call_data,
        object_types=[POST_TYPE, COMMENT_TYPE],
    )


def test_update_channel_index(mocker):
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
def test_upsert_course(mocker):
    """
    Tests that upsert_course calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.tasks.upsert_course")
    course = CourseFactory.create()
    upsert_course(course.id)
    patched_task.delay.assert_called_once_with(course.id)


@pytest.mark.django_db
def test_delete_course(mocker):
    """
    Tests that deindex_course calls the delete tasks for the course and its content files
    """
    mock_del_document = mocker.patch("search.task_helpers.deindex_document")
    mock_bulk_del = mocker.patch("search.task_helpers.deindex_run_content_files")
    course = CourseFactory.create()
    course_es_id = gen_course_id(course.platform, course.course_id)

    deindex_course(course)
    mock_del_document.delay.assert_called_once_with(course_es_id, COURSE_TYPE)
    for run in course.runs.iterator():
        mock_bulk_del.assert_any_call(run.id)


@pytest.mark.django_db
def test_delete_profile(mocker, user):
    """Tests that deleting a user triggers a delete on a profile document"""
    patched_delete_task = mocker.patch("search.task_helpers.deindex_document")
    deindex_profile(user)
    assert patched_delete_task.delay.called is True
    assert patched_delete_task.delay.call_args[0] == (
        gen_profile_id(user.username),
        PROFILE_TYPE,
    )


@pytest.mark.django_db
def test_upsert_program(mocker):
    """
    Tests that upsert_program calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.tasks.upsert_program")
    program = ProgramFactory.create()
    upsert_program(program.id)
    patched_task.delay.assert_called_once_with(program.id)


@pytest.mark.django_db
def test_upsert_video(mocker):
    """
    Tests that upsert_video calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.tasks.upsert_video")
    video = VideoFactory.create()
    upsert_video(video.id)
    patched_task.delay.assert_called_once_with(video.id)


@pytest.mark.django_db
def test_delete_video(mocker):
    """Tests that deleting a video triggers a delete on a video document"""
    patched_delete_task = mocker.patch("search.task_helpers.deindex_document")
    video = VideoFactory.create()
    deindex_video(video)
    assert patched_delete_task.delay.called is True
    assert patched_delete_task.delay.call_args[0] == (gen_video_id(video), VIDEO_TYPE)


@pytest.mark.django_db
@pytest.mark.parametrize(
    "list_type", [UserListType.LIST.value, UserListType.LEARNING_PATH.value]
)
def test_upsert_user_list(mocker, list_type):
    """
    Tests that upsert_user_list calls update_field_values_by_query with the right parameters
    """
    patched_task = mocker.patch("search.tasks.upsert_user_list")
    user_list = UserListFactory.create(list_type=list_type)
    upsert_user_list(user_list.id)
    patched_task.delay.assert_called_once_with(user_list.id)


@pytest.mark.django_db
@pytest.mark.parametrize(
    "list_type", [UserListType.LIST.value, UserListType.LEARNING_PATH.value]
)
def test_delete_user_list(mocker, list_type):
    """Tests that deleting a UserList triggers a delete on a UserList document"""
    patched_delete_task = mocker.patch("search.task_helpers.deindex_document")
    user_list = UserListFactory.create(list_type=list_type)
    deindex_user_list(user_list)
    assert patched_delete_task.delay.called is True
    assert patched_delete_task.delay.call_args[0] == (
        gen_user_list_id(user_list),
        USER_LIST_TYPE,
    )


@pytest.mark.django_db
def test_upsert_content_file(mocker):
    """
    Tests that upsert_content_file calls the correct celery task with parameters
    """
    patched_task = mocker.patch("search.tasks.upsert_content_file")
    content_file = ContentFileFactory.create()
    upsert_content_file(content_file.id)
    patched_task.delay.assert_called_once_with(content_file.id)


@pytest.mark.django_db
def test_index_run_content_files(mocker):
    """
    Tests that index_run_content_files calls the correct celery task w/parameter
    """
    patched_task = mocker.patch("search.tasks.index_run_content_files")
    content_file = ContentFileFactory.create()
    index_run_content_files(content_file.id)
    patched_task.delay.assert_called_once_with(content_file.id)


@pytest.mark.django_db
def test_delete_run_content_files(mocker):
    """Tests that deindex_run_content_files triggers the correct ES delete task"""
    patched_task = mocker.patch("search.tasks.deindex_run_content_files")
    content_file = ContentFileFactory.create()
    deindex_run_content_files(content_file.id)
    patched_task.delay.assert_called_once_with(content_file.id)


@pytest.mark.django_db
def test_upsert_podcast(mocker):
    """
    Tests that upsert_podcast calls search.tasks.upsert_podcast with the right parameters
    """
    patched_task = mocker.patch("search.tasks.upsert_podcast")
    podcast = PodcastFactory.create()
    upsert_podcast(podcast.id)
    patched_task.delay.assert_called_once_with(podcast.id)


@pytest.mark.django_db
def test_upsert_podcast_episode(mocker):
    """
    Tests that upsert_podcast_episode calls search.tasks.upsert_podcast_episode with the right parameters
    """
    patched_task = mocker.patch("search.tasks.upsert_podcast_episode")
    episode = PodcastFactory.create()
    upsert_podcast_episode(episode.id)
    patched_task.delay.assert_called_once_with(episode.id)


@pytest.mark.django_db
def test_delete_podcast(mocker):
    """Tests that deleting a podcast triggers the correct ES delete task"""
    patched_delete_task = mocker.patch("search.task_helpers.deindex_document")
    podcast = PodcastFactory.create()
    deindex_podcast(podcast)
    assert patched_delete_task.delay.called is True
    assert patched_delete_task.delay.call_args[0] == (
        gen_podcast_id(podcast),
        PODCAST_TYPE,
    )


@pytest.mark.django_db
def test_delete_podcast_episode(mocker):
    """Tests that deleting a podcast episode triggers the correct ES delete task"""
    patched_delete_task = mocker.patch("search.task_helpers.deindex_document")
    episode = PodcastEpisodeFactory.create()
    deindex_podcast_episode(episode)
    assert patched_delete_task.delay.called is True
    assert patched_delete_task.delay.call_args[0] == (
        gen_podcast_episode_id(episode),
        PODCAST_EPISODE_TYPE,
    )
