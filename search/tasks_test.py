"""Search task tests"""
# pylint: disable=redefined-outer-name,unused-argument

from django.conf import settings
from praw.exceptions import PRAWException
from prawcore.exceptions import PrawcoreException, NotFound
import pytest

from channels.factories.models import CommentFactory, PostFactory
from channels.models import Post
from channels.constants import LINK_TYPE_LINK, LINK_TYPE_SELF
from course_catalog.constants import PlatformType
from course_catalog.factories import (
    BootcampFactory,
    CourseFactory,
    ProgramFactory,
    VideoFactory,
    UserListFactory,
    ContentFileFactory,
    LearningResourceRunFactory,
)
from open_discussions.factories import UserFactory
from open_discussions.test_utils import assert_not_raises
from search.api import (
    gen_bootcamp_id,
    gen_course_id,
    gen_program_id,
    gen_video_id,
    gen_user_list_id,
    gen_profile_id,
    gen_content_file_id,
)
from search.constants import (
    BOOTCAMP_TYPE,
    COURSE_TYPE,
    POST_TYPE,
    PROGRAM_TYPE,
    COMMENT_TYPE,
    VALID_OBJECT_TYPES,
    VIDEO_TYPE,
    USER_LIST_TYPE,
    PROFILE_TYPE,
)
from search.exceptions import ReindexException, RetryException
from search.serializers import (
    ESBootcampSerializer,
    ESCourseSerializer,
    ESProgramSerializer,
    ESVideoSerializer,
    ESUserListSerializer,
    ESProfileSerializer,
    ESContentFileSerializer,
)
from search.tasks import (
    create_document,
    create_post_document,
    update_link_post_with_preview,
    update_document_with_partial,
    finish_recreate_index,
    increment_document_integer_field,
    update_field_values_by_query,
    index_new_bootcamp,
    index_posts,
    start_recreate_index,
    wrap_retry_exception,
    index_comments,
    index_courses,
    index_videos,
    delete_document,
    upsert_bootcamp,
    upsert_course,
    upsert_program,
    upsert_video,
    upsert_user_list,
    upsert_profile,
    upsert_content_file,
    index_course_content_files,
    index_run_content_files,
    delete_run_content_files,
)


pytestmark = pytest.mark.django_db


@pytest.fixture()
def wrap_retry_mock(mocker):
    """
    Patches the wrap_retry_exception context manager and asserts that it was
    called by any test that uses it
    """
    wrap_mock = mocker.patch("search.tasks.wrap_retry_exception")
    yield
    wrap_mock.assert_called_once_with(PrawcoreException, PRAWException)


@pytest.fixture()
def mocked_api(mocker):
    """Mock object that patches the channels API"""
    return mocker.patch("search.tasks.api")


def test_create_document_task(mocked_api):
    """Test that the create_document task calls the indexing API function with the right args"""
    indexing_api_args = ("doc_id", {"test": "data"})
    create_document(*indexing_api_args)
    assert mocked_api.create_document.call_count == 1
    assert mocked_api.create_document.call_args[0] == indexing_api_args


def test_update_document_with_partial_task(mocked_api):
    """Test that the create_document task calls the indexing API function with the right args"""
    indexing_api_args = ("doc_id", {"test": "data"}, COMMENT_TYPE)
    update_document_with_partial(*indexing_api_args)
    assert mocked_api.update_document_with_partial.call_count == 1
    assert mocked_api.update_document_with_partial.call_args[0] == indexing_api_args


def test_index_new_bootcamp(mocked_api):
    """index_new_bootcamp should call create_document with the serialized bootcamp document based on the primary key"""
    bootcamp = BootcampFactory.create()
    index_new_bootcamp(bootcamp.id)
    data = ESBootcampSerializer(bootcamp).data
    mocked_api.create_document.assert_called_once_with(
        gen_bootcamp_id(bootcamp.course_id), data
    )


def test_upsert_bootcamp_task(mocked_api):
    """Test that upsert_bootcamp will serialize the bootcamp data and upsert it to the ES index"""
    bootcamp = BootcampFactory.create()
    upsert_bootcamp(bootcamp.id)
    data = ESBootcampSerializer(bootcamp).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_bootcamp_id(bootcamp.course_id),
        data,
        BOOTCAMP_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_upsert_course_task(mocked_api):
    """Test that upsert_course will serialize the course data and upsert it to the ES index"""
    course = CourseFactory.create()
    upsert_course(course.id)
    data = ESCourseSerializer(course).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_course_id(course.platform, course.course_id),
        data,
        COURSE_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_upsert_program_task(mocked_api):
    """Test that upsert_program will serialize the video data and upsert it to the ES index"""
    program = ProgramFactory.create()
    upsert_program(program.id)
    data = ESProgramSerializer(program).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_program_id(program),
        data,
        PROGRAM_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_upsert_video_task(mocked_api):
    """Test that upsert_video will serialize the video data and upsert it to the ES index"""
    video = VideoFactory.create()
    upsert_video(video.id)
    video_data = ESVideoSerializer(video).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_video_id(video),
        video_data,
        VIDEO_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_upsert_user_list_task(mocked_api):
    """Test that upsert_user_list will serialize the UserList data and upsert it to the ES index"""
    user_list = UserListFactory.create()
    upsert_user_list(user_list.id)
    data = ESUserListSerializer(user_list).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_user_list_id(user_list),
        data,
        USER_LIST_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_increment_document_integer_field_task(mocked_api):
    """
    Test that the increment_document_integer_field task calls the indexing
    API function with the right args
    """
    indexing_api_args = ("doc_id", {"test": "data"}, 1, POST_TYPE)
    increment_document_integer_field(*indexing_api_args)
    assert mocked_api.increment_document_integer_field.call_count == 1
    assert mocked_api.increment_document_integer_field.call_args[0] == indexing_api_args


def test_update_field_values_by_query(mocked_api):
    """
    Test that the update_field_values_by_query task calls the indexing
    API function with the right args
    """
    indexing_api_args = ({"query": {}}, {"field1": "value1"}, [POST_TYPE])
    update_field_values_by_query(*indexing_api_args)
    assert mocked_api.update_field_values_by_query.call_count == 1
    assert mocked_api.update_field_values_by_query.call_args[0] == indexing_api_args


@pytest.mark.parametrize(
    "post_type,post_url,exp_update_link_post",
    [[LINK_TYPE_LINK, "example.com", True], [LINK_TYPE_SELF, None, False]],
)
def test_create_post_document(mocker, post_type, post_url, exp_update_link_post):
    """
    Test that the create_post_document task calls the API method to create a post document, and for link posts,
    also calls the API method to fetch preview data and update the post
    """
    create_document_mock = mocker.patch("search.tasks.create_document")
    update_link_post_mock = mocker.patch("search.tasks.update_link_post_with_preview")
    indexing_api_args = (
        "doc_id",
        {"post_id": "a", "post_type": post_type, "post_link_url": post_url},
    )
    create_post_document(*indexing_api_args)
    assert create_document_mock.si.call_count == 1
    assert create_document_mock.si.call_args[0] == indexing_api_args
    assert update_link_post_mock.si.called is exp_update_link_post


@pytest.mark.parametrize(
    "resp_content,resp_description,exp_preview_text",
    [
        ["<a> content", None, "content"],
        ["", "description", "description"],
        [None, "description", "description"],
    ],
)
def test_update_link_post_with_preview(
    mocker, mocked_api, resp_content, resp_description, exp_preview_text
):
    """
    Test that update_link_post_with_preview fetches embedly content and updates the given post in the
    database and in ES
    """
    get_embedly_content_mock = mocker.patch("search.tasks.get_embedly_content")
    get_embedly_content_mock.return_value.json.return_value = {
        "content": resp_content,
        "description": resp_description,
    }
    post_data = {"post_id": "a", "post_link_url": "example.com"}
    post = PostFactory.create(post_id=post_data["post_id"])

    update_link_post_with_preview("abc", post_data)

    assert get_embedly_content_mock.call_args[0][0] == post_data["post_link_url"]
    assert Post.objects.get(id=post.id).preview_text == exp_preview_text
    assert mocked_api.update_post.call_count == 1


@pytest.mark.parametrize("error", [KeyError, NotFound])
def test_wrap_retry_exception(error):
    """wrap_retry_exception should raise RetryException when other exceptions are raised"""
    with assert_not_raises():
        with wrap_retry_exception(error):
            # Should not raise an exception
            pass


@pytest.mark.parametrize("matching", [True, False])
def test_wrap_retry_exception_matching(matching):
    """A matching exception should raise a RetryException"""

    class SubError(KeyError):
        """Use a subclass to assert isinstance use"""

    def raise_thing():
        """raise the exception"""
        if matching:
            raise SubError()
        else:
            raise TabError()

    matching_exception = RetryException if matching else TabError
    with pytest.raises(matching_exception):
        with wrap_retry_exception(KeyError):
            raise_thing()


@pytest.mark.parametrize("with_error", [True, False])
def test_index_posts(
    mocker, wrap_retry_mock, with_error
):  # pylint: disable=unused-argument
    """index_post should call the api function of the same name"""
    index_post_mock = mocker.patch("search.indexing_api.index_posts")
    if with_error:
        index_post_mock.side_effect = TabError
    post_ids = [1, 2, 3]
    result = index_posts.delay(post_ids).get()
    assert result == ("index_posts threw an error" if with_error else None)

    index_post_mock.assert_called_once_with(post_ids)


@pytest.mark.parametrize("with_error", [True, False])
def test_index_comments(
    mocker, wrap_retry_mock, with_error
):  # pylint: disable=unused-argument
    """index_comments should call the api function of the same name"""
    index_comments_mock = mocker.patch("search.indexing_api.index_comments")
    if with_error:
        index_comments_mock.side_effect = TabError
    post_ids = [1, 2, 3]
    result = index_comments.delay(post_ids).get()
    assert result == ("index_comments threw an error" if with_error else None)

    index_comments_mock.assert_called_once_with(post_ids)


@pytest.mark.parametrize("with_error", [True, False])
def test_index_videos(mocker, with_error):  # pylint: disable=unused-argument
    """index_videos should call the api function of the same name"""
    index_videos_mock = mocker.patch("search.indexing_api.index_videos")
    if with_error:
        index_videos_mock.side_effect = TabError
    result = index_videos.delay([1, 2, 3]).get()
    assert result == ("index_videos threw an error" if with_error else None)

    index_videos_mock.assert_called_once_with([1, 2, 3])


def test_start_recreate_index(
    mocker, mocked_celery, user
):  # pylint:disable=too-many-locals
    """
    recreate_index should recreate the elasticsearch index and reindex all data with it
    """
    settings.INDEXING_API_USERNAME = user.username
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 2
    mock_blacklist = mocker.patch("search.tasks.load_course_blacklist", return_value=[])
    UserFactory.create_batch(
        4, is_active=False
    )  # these should not show up in the indexing
    comments = sorted(CommentFactory.create_batch(4), key=lambda comment: comment.id)
    posts = sorted([comment.post for comment in comments], key=lambda post: post.id)
    users = sorted([item.author for item in posts + comments], key=lambda user: user.id)
    courses = sorted(CourseFactory.create_batch(4), key=lambda course: course.id)
    videos = sorted(VideoFactory.create_batch(4), key=lambda video: video.id)
    index_posts_mock = mocker.patch("search.tasks.index_posts", autospec=True)
    index_comments_mock = mocker.patch("search.tasks.index_comments", autospec=True)
    index_profiles_mock = mocker.patch("search.tasks.index_profiles", autospec=True)
    index_courses_mock = mocker.patch("search.tasks.index_courses", autospec=True)
    index_videos_mock = mocker.patch("search.tasks.index_videos", autospec=True)
    backing_index = "backing"
    create_backing_index_mock = mocker.patch(
        "search.indexing_api.create_backing_index",
        autospec=True,
        return_value=backing_index,
    )
    finish_recreate_index_mock = mocker.patch(
        "search.tasks.finish_recreate_index", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        start_recreate_index.delay()
    for doctype in VALID_OBJECT_TYPES:
        create_backing_index_mock.assert_any_call(doctype)
    finish_recreate_index_mock.s.assert_called_once_with(
        {
            "post": backing_index,
            "comment": backing_index,
            "profile": backing_index,
            "course": backing_index,
            "bootcamp": backing_index,
            "program": backing_index,
            "userlist": backing_index,
            "video": backing_index,
        }
    )
    assert mocked_celery.group.call_count == 1
    mock_blacklist.assert_called_once()

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])

    assert index_posts_mock.si.call_count == 2
    index_posts_mock.si.assert_any_call([posts[0].id, posts[1].id])
    index_posts_mock.si.assert_any_call([posts[2].id, posts[3].id])

    assert index_comments_mock.si.call_count == 2
    index_comments_mock.si.assert_any_call([comments[0].id, comments[1].id])
    index_comments_mock.si.assert_any_call([comments[2].id, comments[3].id])

    assert index_profiles_mock.si.call_count == 4
    for offset in range(4):
        index_profiles_mock.si.assert_any_call(
            [users[offset * 2].profile.id, users[offset * 2 + 1].profile.id]
        )

    assert index_courses_mock.si.call_count == 2
    index_courses_mock.si.assert_any_call([courses[0].id, courses[1].id])
    index_courses_mock.si.assert_any_call([courses[2].id, courses[3].id])

    assert index_videos_mock.si.call_count == 2
    index_videos_mock.si.assert_any_call([videos[0].id, videos[1].id])
    index_videos_mock.si.assert_any_call([videos[2].id, videos[3].id])

    assert mocked_celery.replace.call_count == 1
    assert mocked_celery.replace.call_args[0][1] == mocked_celery.chain.return_value


@pytest.mark.parametrize("with_error", [True, False])
def test_finish_recreate_index(mocker, with_error):
    """
    finish_recreate_index should attach the backing index to the default alias
    """
    backing_indices = {"post": "backing", "comment": "backing", "profile": "backing"}
    results = ["error"] if with_error else []
    switch_indices_mock = mocker.patch(
        "search.indexing_api.switch_indices", autospec=True
    )

    if with_error:
        with pytest.raises(ReindexException):
            finish_recreate_index.delay(results, backing_indices)
        assert switch_indices_mock.call_count == 0
    else:
        finish_recreate_index.delay(results, backing_indices)
        switch_indices_mock.assert_any_call("backing", POST_TYPE)
        switch_indices_mock.assert_any_call("backing", COMMENT_TYPE)


@pytest.mark.parametrize("with_error", [True, False])
def test_index_courses(mocker, with_error):
    """index_courses should call the api function of the same name"""
    index_courses_mock = mocker.patch("search.indexing_api.index_courses")
    if with_error:
        index_courses_mock.side_effect = TabError
    result = index_courses.delay([1, 2, 3]).get()
    assert result == ("index_courses threw an error" if with_error else None)

    index_courses_mock.assert_called_once_with([1, 2, 3])


def test_delete_document(mocker):
    """delete_document should call the api function of the same name"""
    delete_document_mock = mocker.patch("search.indexing_api.delete_document")
    delete_document.delay(1, "course").get()
    delete_document_mock.assert_called_once_with(1, "course")


@pytest.mark.parametrize("is_indexing_user", [True, False])
def test_upsert_profile_task(mocked_api, user, settings, is_indexing_user):
    """Test that upsert_profile will serialize the profile data and upsert it to the ES index"""
    if is_indexing_user:
        user.username = settings.INDEXING_API_USERNAME
        user.save()

    upsert_profile(user.profile.id)

    if is_indexing_user:
        mocked_api.upsert_document.assert_not_called()
    else:
        data = ESProfileSerializer().serialize(user.profile)
        mocked_api.upsert_document.assert_called_once_with(
            gen_profile_id(user.username),
            data,
            PROFILE_TYPE,
            retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
        )


def test_upsert_content_file_task(mocked_api):
    """Test that upsert_content_file will serialize the content file data and upsert it to the ES index"""
    content_file = ContentFileFactory.create(
        run=LearningResourceRunFactory.create(platform=PlatformType.ocw.value)
    )
    course = content_file.run.content_object
    upsert_content_file(content_file.id)
    data = ESContentFileSerializer(content_file).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_content_file_id(content_file.key),
        data,
        COURSE_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
        routing=gen_course_id(course.platform, course.course_id),
    )


@pytest.mark.parametrize("with_error", [True, False])
def test_index_course_content_files(mocker, with_error):
    """index_course_content_files should call the api function of the same name"""
    index_content_files_mock = mocker.patch(
        "search.indexing_api.index_course_content_files"
    )
    if with_error:
        index_content_files_mock.side_effect = TabError
    result = index_course_content_files.delay([1, 2, 3]).get()
    assert result == (
        "index_course_content_files threw an error" if with_error else None
    )

    index_content_files_mock.assert_called_once_with([1, 2, 3])


@pytest.mark.parametrize("with_error", [True, False])
def test_index_run_content_files(mocker, with_error):
    """index_run_content_files should call the api function of the same name"""
    index_run_content_files_mock = mocker.patch(
        "search.indexing_api.index_run_content_files"
    )
    if with_error:
        index_run_content_files_mock.side_effect = TabError
    result = index_run_content_files.delay(1).get()
    assert result == ("index_run_content_files threw an error" if with_error else None)

    index_run_content_files_mock.assert_called_once_with(1)


@pytest.mark.parametrize("with_error", [True, False])
def test_delete_run_content_files(mocker, with_error):
    """delete_run_content_files should call the api function of the same name"""
    delete_run_content_files_mock = mocker.patch(
        "search.indexing_api.delete_run_content_files"
    )
    if with_error:
        delete_run_content_files_mock.side_effect = TabError
    result = delete_run_content_files.delay(1).get()
    assert result == ("delete_run_content_files threw an error" if with_error else None)

    delete_run_content_files_mock.assert_called_once_with(1)
