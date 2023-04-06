"""Search task tests"""
# pylint: disable=redefined-outer-name,unused-argument

import pytest
from django.conf import settings
from praw.exceptions import PRAWException
from prawcore.exceptions import NotFound, PrawcoreException

from channels.constants import LINK_TYPE_LINK, LINK_TYPE_SELF
from channels.factories.models import CommentFactory, PostFactory
from channels.models import Post
from course_catalog.constants import PlatformType, PrivacyLevel
from course_catalog.factories import (
    ContentFileFactory,
    CourseFactory,
    LearningResourceRunFactory,
    PodcastEpisodeFactory,
    PodcastFactory,
    ProgramFactory,
    StaffListFactory,
    StaffListItemFactory,
    UserListFactory,
    UserListItemFactory,
    VideoFactory,
)
from open_discussions.factories import UserFactory
from open_discussions.test_utils import assert_not_raises
from search import tasks
from search.api import (
    gen_content_file_id,
    gen_course_id,
    gen_podcast_episode_id,
    gen_podcast_id,
    gen_profile_id,
    gen_program_id,
    gen_staff_list_id,
    gen_user_list_id,
    gen_video_id,
)
from search.constants import (
    COMMENT_TYPE,
    COURSE_TYPE,
    PODCAST_EPISODE_TYPE,
    PODCAST_TYPE,
    POST_TYPE,
    PROFILE_TYPE,
    PROGRAM_TYPE,
    RESOURCE_FILE_TYPE,
    STAFF_LIST_TYPE,
    USER_LIST_TYPE,
    VALID_OBJECT_TYPES,
    VIDEO_TYPE,
)
from search.exceptions import ReindexException, RetryException
from search.serializers import (
    OSContentFileSerializer,
    OSCourseSerializer,
    OSPodcastEpisodeSerializer,
    OSPodcastSerializer,
    ESProfileSerializer,
    OSProgramSerializer,
    OSStaffListSerializer,
    OSUserListSerializer,
    OSVideoSerializer,
)
from search.tasks import (
    bulk_delete_staff_lists,
    create_document,
    create_post_document,
    delete_document,
    delete_run_content_files,
    finish_recreate_index,
    increment_document_integer_field,
    index_comments,
    index_course_content_files,
    index_courses,
    index_posts,
    index_run_content_files,
    index_staff_lists,
    index_videos,
    start_recreate_index,
    start_update_index,
    update_document_with_partial,
    update_field_values_by_query,
    update_link_post_with_preview,
    upsert_content_file,
    upsert_course,
    upsert_podcast,
    upsert_podcast_episode,
    upsert_profile,
    upsert_program,
    upsert_staff_list,
    upsert_user_list,
    upsert_video,
    wrap_retry_exception,
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


def test_upsert_course_task(mocked_api):
    """Test that upsert_course will serialize the course data and upsert it to the ES index"""
    course = CourseFactory.create()
    upsert_course(course.id)
    data = OSCourseSerializer(course).data
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
    data = OSProgramSerializer(program).data
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
    video_data = OSVideoSerializer(video).data
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
    data = OSUserListSerializer(user_list).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_user_list_id(user_list),
        data,
        USER_LIST_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_upsert_staff_list_task(mocked_api):
    """Test that upsert_staff_list will serialize the StaffList data and upsert it to the ES index"""
    staff_list = StaffListFactory.create()
    upsert_staff_list(staff_list.id)
    data = OSStaffListSerializer(staff_list).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_staff_list_id(staff_list),
        data,
        STAFF_LIST_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_upsert_podcast_task(mocked_api):
    """Test that upsert_podcast will serialize the podcast data and upsert it to the ES index"""
    podcast = PodcastFactory.create()
    upsert_podcast(podcast.id)
    podcast_data = OSPodcastSerializer(podcast).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_podcast_id(podcast),
        podcast_data,
        PODCAST_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
    )


def test_upsert_podcast_episode_task(mocked_api):
    """Test that upsert_podcast_episode will serialize the podcast episode data and upsert it to the ES index"""
    podcast_episode = PodcastEpisodeFactory.create()
    upsert_podcast_episode(podcast_episode.id)
    podcast_episode_data = OSPodcastEpisodeSerializer(podcast_episode).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_podcast_episode_id(podcast_episode),
        podcast_episode_data,
        PODCAST_EPISODE_TYPE,
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
@pytest.mark.parametrize("update_only", [True, False])
def test_index_posts(
    mocker, wrap_retry_mock, with_error, update_only
):  # pylint: disable=unused-argument
    """index_post should call the api function of the same name"""
    index_post_mock = mocker.patch("search.indexing_api.index_posts")
    if with_error:
        index_post_mock.side_effect = TabError
    post_ids = [1, 2, 3]
    result = index_posts.delay(post_ids, update_only).get()
    assert result == ("index_posts threw an error" if with_error else None)

    index_post_mock.assert_called_once_with(post_ids, update_only)


@pytest.mark.parametrize("with_error", [True, False])
@pytest.mark.parametrize("update_only", [True, False])
def test_index_comments(
    mocker, wrap_retry_mock, with_error, update_only
):  # pylint: disable=unused-argument
    """index_comments should call the api function of the same name"""
    index_comments_mock = mocker.patch("search.indexing_api.index_comments")
    if with_error:
        index_comments_mock.side_effect = TabError
    post_ids = [1, 2, 3]
    result = index_comments.delay(post_ids, update_only).get()
    assert result == ("index_comments threw an error" if with_error else None)

    index_comments_mock.assert_called_once_with(post_ids, update_only)


@pytest.mark.parametrize("with_error", [True, False])
@pytest.mark.parametrize("update_only", [True, False])
def test_index_videos(
    mocker, with_error, update_only
):  # pylint: disable=unused-argument
    """index_videos should call the api function of the same name"""
    index_videos_mock = mocker.patch("search.indexing_api.index_videos")
    if with_error:
        index_videos_mock.side_effect = TabError
    result = index_videos.delay([1, 2, 3], update_only).get()
    assert result == ("index_videos threw an error" if with_error else None)

    index_videos_mock.assert_called_once_with([1, 2, 3], update_only)


@pytest.mark.parametrize("with_error", [True, False])
@pytest.mark.parametrize("update_only", [True, False])
def test_index_staff_lists(mocker, with_error, update_only):
    """index_staff_lists should call the api function of the same name"""
    index_staff_lists_mock = mocker.patch("search.indexing_api.index_staff_lists")
    if with_error:
        index_staff_lists_mock.side_effect = TabError
    result = index_staff_lists.delay([1, 2, 3], update_only).get()
    assert result == ("index_staff_lists threw an error" if with_error else None)

    index_staff_lists_mock.assert_called_once_with([1, 2, 3], update_only)


@pytest.mark.parametrize("with_error", [True, False])
def test_bulk_delete_staff_lists(mocker, with_error):  # pylint: disable=unused-argument
    """bulk_delete_staff_lists should call the api function of the same name"""
    bulk_delete_staff_lists_mock = mocker.patch(
        "search.indexing_api.delete_staff_lists"
    )
    if with_error:
        bulk_delete_staff_lists_mock.side_effect = TabError
    result = bulk_delete_staff_lists.delay([1, 2, 3]).get()
    assert result == ("bulk_delete_staff_lists threw an error" if with_error else None)

    bulk_delete_staff_lists_mock.assert_called_once_with([1, 2, 3])


@pytest.mark.parametrize(
    "indexes",
    [
        ["post", "comment", "profile"],
        ["course", "program"],
        ["userlist", "stafflist"],
        ["video"],
        ["podcast", "podcastepisode"],
    ],
)
def test_start_recreate_index(
    mocker, mocked_celery, user, indexes
):  # pylint:disable=too-many-locals,too-many-statements,too-many-branches
    """
    recreate_index should recreate the elasticsearch index and reindex all data with it
    """
    settings.INDEXING_API_USERNAME = user.username
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 2
    mock_blocklist = mocker.patch("search.tasks.load_course_blocklist", return_value=[])
    UserFactory.create_batch(
        4, is_active=False
    )  # these should not show up in the indexing
    comments = sorted(CommentFactory.create_batch(4), key=lambda comment: comment.id)
    posts = sorted([comment.post for comment in comments], key=lambda post: post.id)
    users = sorted([item.author for item in posts + comments], key=lambda user: user.id)
    platforms = [
        PlatformType.ocw,
        PlatformType.mitx,
        PlatformType.xpro,
        PlatformType.micromasters,
        PlatformType.oll,
        PlatformType.youtube,
    ]
    courses = sorted(
        [CourseFactory.create(platform=platform.value) for platform in platforms],
        key=lambda course: course.id,
    )
    videos = sorted(VideoFactory.create_batch(4), key=lambda video: video.id)
    podcasts = sorted(PodcastFactory.create_batch(4), key=lambda podcast: podcast.id)
    podcast_episodes = sorted(
        PodcastEpisodeFactory.create_batch(4),
        key=lambda podcast_episode: podcast_episode.id,
    )
    if USER_LIST_TYPE in indexes:
        userlists = UserListFactory.create_batch(
            4, privacy_level=PrivacyLevel.public.value
        )
        for userlist in userlists:
            UserListItemFactory.create(user_list=userlist)
    if STAFF_LIST_TYPE in indexes:
        stafflists = StaffListFactory.create_batch(
            4, privacy_level=PrivacyLevel.public.value
        )
        for stafflist in stafflists:
            StaffListItemFactory.create(staff_list=stafflist)
    index_posts_mock = mocker.patch("search.tasks.index_posts", autospec=True)
    index_comments_mock = mocker.patch("search.tasks.index_comments", autospec=True)
    index_profiles_mock = mocker.patch("search.tasks.index_profiles", autospec=True)
    index_courses_mock = mocker.patch("search.tasks.index_courses", autospec=True)
    index_videos_mock = mocker.patch("search.tasks.index_videos", autospec=True)
    index_podcasts_mock = mocker.patch("search.tasks.index_podcasts", autospec=True)
    index_podcast_episodes_mock = mocker.patch(
        "search.tasks.index_podcast_episodes", autospec=True
    )
    index_course_content_mock = mocker.patch(
        "search.tasks.index_course_content_files", autospec=True
    )
    index_userlists_mock = mocker.patch("search.tasks.index_user_lists", autospec=True)
    index_stafflists_mock = mocker.patch(
        "search.tasks.index_staff_lists", autospec=True
    )
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
        start_recreate_index.delay(indexes)

    finish_recreate_index_dict = {}

    for doctype in VALID_OBJECT_TYPES:
        if doctype in indexes:
            finish_recreate_index_dict[doctype] = backing_index
            create_backing_index_mock.assert_any_call(doctype)

    finish_recreate_index_mock.s.assert_called_once_with(finish_recreate_index_dict)
    assert mocked_celery.group.call_count == 1

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])

    if POST_TYPE in indexes:
        assert index_posts_mock.si.call_count == 2
        index_posts_mock.si.assert_any_call([posts[0].id, posts[1].id])
        index_posts_mock.si.assert_any_call([posts[2].id, posts[3].id])

    if COMMENT_TYPE in indexes:
        assert index_comments_mock.si.call_count == 2
        index_comments_mock.si.assert_any_call([comments[0].id, comments[1].id])
        index_comments_mock.si.assert_any_call([comments[2].id, comments[3].id])

    if PROFILE_TYPE in indexes:
        assert index_profiles_mock.si.call_count == 4
        for offset in range(4):
            index_profiles_mock.si.assert_any_call(
                [users[offset * 2].profile.id, users[offset * 2 + 1].profile.id]
            )

    if COURSE_TYPE in indexes:
        mock_blocklist.assert_called_once()
        assert index_courses_mock.si.call_count == 3
        index_courses_mock.si.assert_any_call([courses[0].id, courses[1].id])
        index_courses_mock.si.assert_any_call([courses[2].id, courses[3].id])
        index_courses_mock.si.assert_any_call([courses[4].id, courses[5].id])

        # chunk size is 2 and there is only one course each for ocw, xpro, and mitx
        assert index_course_content_mock.si.call_count == 2
        index_course_content_mock.si.assert_any_call(
            [
                *[
                    course.id
                    for course in courses
                    if course.platform == PlatformType.ocw.value
                ],
                *[
                    course.id
                    for course in courses
                    if course.platform == PlatformType.mitx.value
                ],
            ]
        )
        index_course_content_mock.si.assert_any_call(
            [
                *[
                    course.id
                    for course in courses
                    if course.platform == PlatformType.xpro.value
                ],
            ]
        )

    if VIDEO_TYPE in indexes:
        assert index_videos_mock.si.call_count == 2
        index_videos_mock.si.assert_any_call([videos[0].id, videos[1].id])
        index_videos_mock.si.assert_any_call([videos[2].id, videos[3].id])

    if PODCAST_TYPE in indexes:
        assert index_podcasts_mock.si.call_count == 4
        index_podcasts_mock.si.assert_any_call([podcasts[0].id, podcasts[1].id])
        index_podcasts_mock.si.assert_any_call([podcasts[2].id, podcasts[3].id])

    if PODCAST_EPISODE_TYPE in indexes:
        assert index_podcast_episodes_mock.si.call_count == 2
        index_podcast_episodes_mock.si.assert_any_call(
            [podcast_episodes[0].id, podcast_episodes[1].id]
        )
        index_podcast_episodes_mock.si.assert_any_call(
            [podcast_episodes[2].id, podcast_episodes[3].id]
        )

    if USER_LIST_TYPE in indexes:
        assert index_userlists_mock.si.call_count == 2
        index_userlists_mock.si.assert_any_call([userlists[0].id, userlists[1].id])
        index_userlists_mock.si.assert_any_call([userlists[2].id, userlists[3].id])

    if STAFF_LIST_TYPE in indexes:
        assert index_stafflists_mock.si.call_count == 2
        index_stafflists_mock.si.assert_any_call([stafflists[0].id, stafflists[1].id])
        index_stafflists_mock.si.assert_any_call([stafflists[2].id, stafflists[3].id])

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
@pytest.mark.parametrize("update_only", [True, False])
def test_index_courses(mocker, with_error, update_only):
    """index_courses should call the api function of the same name"""
    index_courses_mock = mocker.patch("search.indexing_api.index_courses")
    if with_error:
        index_courses_mock.side_effect = TabError
    result = index_courses.delay([1, 2, 3], update_only).get()
    assert result == ("index_courses threw an error" if with_error else None)

    index_courses_mock.assert_called_once_with([1, 2, 3], update_only)


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
    data = OSContentFileSerializer(content_file).data
    mocked_api.upsert_document.assert_called_once_with(
        gen_content_file_id(content_file.key),
        data,
        COURSE_TYPE,
        retry_on_conflict=settings.INDEXING_ERROR_RETRIES,
        routing=gen_course_id(course.platform, course.course_id),
    )


@pytest.mark.parametrize("with_error", [True, False])
@pytest.mark.parametrize("update_only", [True, False])
def test_index_course_content_files(mocker, with_error, update_only):
    """index_course_content_files should call the api function of the same name"""
    index_content_files_mock = mocker.patch(
        "search.indexing_api.index_course_content_files"
    )
    if with_error:
        index_content_files_mock.side_effect = TabError
    result = index_course_content_files.delay([1, 2, 3], update_only).get()
    assert result == (
        "index_course_content_files threw an error" if with_error else None
    )

    index_content_files_mock.assert_called_once_with([1, 2, 3], update_only)


@pytest.mark.parametrize("with_error", [True, False])
@pytest.mark.parametrize("update_only", [True, False])
def test_index_run_content_files(mocker, with_error, update_only):
    """index_run_content_files should call the api function of the same name"""
    index_run_content_files_mock = mocker.patch(
        "search.indexing_api.index_run_content_files"
    )
    delete_run_content_files_mock = mocker.patch(
        "search.indexing_api.delete_run_content_files"
    )
    if with_error:
        index_run_content_files_mock.side_effect = TabError
    result = index_run_content_files.delay(1, update_only).get()
    assert result == ("index_run_content_files threw an error" if with_error else None)

    index_run_content_files_mock.assert_called_once_with(1, update_only)

    if not with_error:
        delete_run_content_files_mock.assert_called_once_with(1, True)


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


@pytest.mark.parametrize("with_error", [True, False])
@pytest.mark.parametrize(
    "tasks_func_name, indexing_func_name",
    [
        ("bulk_delete_profiles", "delete_profiles"),
        ("bulk_delete_courses", "delete_courses"),
        ("bulk_delete_programs", "delete_programs"),
        ("bulk_delete_user_lists", "delete_user_lists"),
        ("bulk_delete_videos", "delete_videos"),
        ("bulk_delete_podcasts", "delete_podcasts"),
        ("bulk_delete_podcast_episodes", "delete_podcast_episodes"),
    ],
)
def test_bulk_deletion_tasks(mocker, with_error, tasks_func_name, indexing_func_name):
    """bulk deletion tasks should call corresponding indexing api function"""
    indexing_api_task_mock = mocker.patch(f"search.indexing_api.{indexing_func_name}")

    task = getattr(tasks, tasks_func_name)

    if with_error:
        indexing_api_task_mock.side_effect = TabError
    result = task.delay([1]).get()
    assert result == (f"{tasks_func_name} threw an error" if with_error else None)

    indexing_api_task_mock.assert_called_once_with([1])


@pytest.mark.parametrize(
    "indexes, platform",
    [
        (
            [
                "post",
                "comment",
                "profile",
                "program",
                "video",
                "podcast",
                "podcastepisode",
            ],
            None,
        ),
        (["course", "resourcefile"], None),
        (["course", "resourcefile"], PlatformType.ocw.value),
        (["course", "resourcefile"], PlatformType.mitx.value),
        (["course", "resourcefile"], PlatformType.xpro.value),
    ],
)
def test_start_update_index(
    mocker, mocked_celery, user, indexes, platform
):  # pylint:disable=too-many-locals,too-many-statements,too-many-branches
    """
    recreate_index should recreate the elasticsearch index and reindex all data with it
    """
    settings.INDEXING_API_USERNAME = user.username
    settings.ELASTICSEARCH_INDEXING_CHUNK_SIZE = 2
    mock_blocklist = mocker.patch("search.tasks.load_course_blocklist", return_value=[])
    inactive_users = UserFactory.create_batch(4, is_active=False)
    comments = sorted(CommentFactory.create_batch(4), key=lambda comment: comment.id)

    posts = sorted([comment.post for comment in comments], key=lambda post: post.id)
    users = sorted([item.author for item in posts + comments], key=lambda user: user.id)

    platforms = [
        PlatformType.ocw,
        PlatformType.mitx,
        PlatformType.xpro,
        PlatformType.micromasters,
        PlatformType.oll,
        PlatformType.youtube,
    ]
    courses = sorted(
        [CourseFactory.create(platform=platform.value) for platform in platforms],
        key=lambda course: course.id,
    )

    unpublished_courses = sorted(
        [
            CourseFactory.create(platform=platform.value, published=False)
            for platform in platforms
        ],
        key=lambda course: course.id,
    )

    videos = sorted(VideoFactory.create_batch(4), key=lambda video: video.id)
    unpublished_video = VideoFactory.create(published=False)

    podcasts = sorted(PodcastFactory.create_batch(4), key=lambda podcast: podcast.id)
    unpublished_podcast = PodcastFactory.create(published=False)

    podcast_episodes = sorted(
        PodcastEpisodeFactory.create_batch(4),
        key=lambda podcast_episode: podcast_episode.id,
    )

    unpublished_podcast_episode = PodcastEpisodeFactory.create(published=False)

    index_posts_mock = mocker.patch("search.tasks.index_posts", autospec=True)
    index_comments_mock = mocker.patch("search.tasks.index_comments", autospec=True)

    index_profiles_mock = mocker.patch("search.tasks.index_profiles", autospec=True)
    delete_profiles_mock = mocker.patch(
        "search.tasks.bulk_delete_profiles", autospec=True
    )

    index_courses_mock = mocker.patch("search.tasks.index_courses", autospec=True)
    delete_courses_mock = mocker.patch(
        "search.tasks.bulk_delete_courses", autospec=True
    )

    index_videos_mock = mocker.patch("search.tasks.index_videos", autospec=True)
    delete_videos_mock = mocker.patch("search.tasks.bulk_delete_videos", autospec=True)

    index_podcasts_mock = mocker.patch("search.tasks.index_podcasts", autospec=True)
    delete_podcasts_mock = mocker.patch(
        "search.tasks.bulk_delete_podcasts", autospec=True
    )

    index_podcast_episodes_mock = mocker.patch(
        "search.tasks.index_podcast_episodes", autospec=True
    )
    delete_podcast_episodes_mock = mocker.patch(
        "search.tasks.bulk_delete_podcast_episodes", autospec=True
    )

    index_course_content_mock = mocker.patch(
        "search.tasks.index_course_content_files", autospec=True
    )

    with pytest.raises(mocked_celery.replace_exception_class):
        start_update_index.delay(indexes, platform)

    assert mocked_celery.group.call_count == 1

    # Celery's 'group' function takes a generator as an argument. In order to make assertions about the items
    # in that generator, 'list' is being called to force iteration through all of those items.
    list(mocked_celery.group.call_args[0][0])

    if POST_TYPE in indexes:
        assert index_posts_mock.si.call_count == 2
        index_posts_mock.si.assert_any_call([posts[0].id, posts[1].id], True)
        index_posts_mock.si.assert_any_call([posts[2].id, posts[3].id], True)

    if COMMENT_TYPE in indexes:
        assert index_comments_mock.si.call_count == 2
        index_comments_mock.si.assert_any_call([comments[0].id, comments[1].id], True)
        index_comments_mock.si.assert_any_call([comments[2].id, comments[3].id], True)

    if PROFILE_TYPE in indexes:
        assert index_profiles_mock.si.call_count == 4
        for offset in range(4):
            index_profiles_mock.si.assert_any_call(
                [users[offset * 2].profile.id, users[offset * 2 + 1].profile.id], True
            )

        assert delete_profiles_mock.si.call_count == 2
        for offset in range(2):
            delete_profiles_mock.si.assert_any_call(
                [
                    inactive_users[offset * 2].profile.id,
                    inactive_users[offset * 2 + 1].profile.id,
                ]
            )

    if COURSE_TYPE in indexes:
        mock_blocklist.assert_called_once()

        if platform:
            assert index_courses_mock.si.call_count == 1
            course = next(course for course in courses if course.platform == platform)
            index_courses_mock.si.assert_any_call([course.id], True)

            assert delete_courses_mock.si.call_count == 1
            unpublished_course = next(
                course for course in unpublished_courses if course.platform == platform
            )
            delete_courses_mock.si.assert_any_call([unpublished_course.id])
        else:
            assert index_courses_mock.si.call_count == 3
            index_courses_mock.si.assert_any_call([courses[0].id, courses[1].id], True)
            index_courses_mock.si.assert_any_call([courses[2].id, courses[3].id], True)
            index_courses_mock.si.assert_any_call([courses[4].id, courses[5].id], True)

            assert delete_courses_mock.si.call_count == 3
            delete_courses_mock.si.assert_any_call(
                [unpublished_courses[0].id, unpublished_courses[1].id]
            )
            delete_courses_mock.si.assert_any_call(
                [unpublished_courses[2].id, unpublished_courses[3].id]
            )
            delete_courses_mock.si.assert_any_call(
                [unpublished_courses[4].id, unpublished_courses[5].id]
            )

    if RESOURCE_FILE_TYPE in indexes:
        if platform in (PlatformType.ocw.value, PlatformType.xpro.value):
            assert index_course_content_mock.si.call_count == 1
            course = next(course for course in courses if course.platform == platform)

            index_course_content_mock.si.assert_any_call([course.id], True)

        elif platform:
            assert index_course_content_mock.si.call_count == 0
        else:
            assert index_course_content_mock.si.call_count == 1
            index_course_content_mock.si.assert_any_call(
                [
                    *[
                        course.id
                        for course in courses
                        if course.platform == PlatformType.ocw.value
                    ],
                    *[
                        course.id
                        for course in courses
                        if course.platform == PlatformType.xpro.value
                    ],
                ],
                True,
            )

    if VIDEO_TYPE in indexes:
        assert index_videos_mock.si.call_count == 2
        index_videos_mock.si.assert_any_call([videos[0].id, videos[1].id], True)
        index_videos_mock.si.assert_any_call([videos[2].id, videos[3].id], True)

        assert delete_videos_mock.si.call_count == 1
        delete_videos_mock.si.assert_any_call([unpublished_video.id])

    if PODCAST_TYPE in indexes:
        assert index_podcasts_mock.si.call_count == 5
        index_podcasts_mock.si.assert_any_call([podcasts[0].id, podcasts[1].id], True)
        index_podcasts_mock.si.assert_any_call([podcasts[2].id, podcasts[3].id], True)

        assert delete_podcasts_mock.si.call_count == 1
        delete_podcasts_mock.si.assert_any_call([unpublished_podcast.id])

    if PODCAST_EPISODE_TYPE in indexes:
        assert index_podcast_episodes_mock.si.call_count == 2
        index_podcast_episodes_mock.si.assert_any_call(
            [podcast_episodes[0].id, podcast_episodes[1].id], True
        )
        index_podcast_episodes_mock.si.assert_any_call(
            [podcast_episodes[2].id, podcast_episodes[3].id], True
        )

        assert delete_podcast_episodes_mock.si.call_count == 1
        delete_podcast_episodes_mock.si.assert_any_call(
            [unpublished_podcast_episode.id]
        )

    assert mocked_celery.replace.call_count == 1
    assert mocked_celery.replace.call_args[0][1] == mocked_celery.group.return_value
