"""Tests for ETL loaders"""
# pylint: disable=redefined-outer-name,too-many-locals,too-many-lines
from types import SimpleNamespace

import pytest
from django.contrib.contenttypes.models import ContentType
from django.forms.models import model_to_dict

from course_catalog.constants import PlatformType, PrivacyLevel, UserListType
from course_catalog.etl.constants import CourseLoaderConfig, OfferedByLoaderConfig
from course_catalog.etl.exceptions import ExtractException
from course_catalog.etl.loaders import (
    load_content_file,
    load_content_files,
    load_course,
    load_courses,
    load_instructors,
    load_offered_bys,
    load_playlist,
    load_playlist_user_list,
    load_playlists,
    load_podcast,
    load_podcast_episode,
    load_podcasts,
    load_prices,
    load_program,
    load_programs,
    load_run,
    load_topics,
    load_video,
    load_video_channels,
    load_videos,
)
from course_catalog.etl.xpro import _parse_datetime
from course_catalog.factories import (
    ContentFileFactory,
    CourseFactory,
    CourseInstructorFactory,
    CoursePriceFactory,
    CourseTopicFactory,
    LearningResourceOfferorFactory,
    LearningResourceRunFactory,
    PlaylistFactory,
    PodcastEpisodeFactory,
    PodcastFactory,
    ProgramFactory,
    UserListFactory,
    VideoChannelFactory,
    VideoFactory,
)
from course_catalog.models import (
    ContentFile,
    Course,
    LearningResourceRun,
    Playlist,
    PlaylistVideo,
    Podcast,
    PodcastEpisode,
    Program,
    ProgramItem,
    UserList,
    UserListItem,
    Video,
    VideoChannel,
)

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def mock_blocklist(mocker):
    """Mock the load_course_blocklist function"""
    return mocker.patch(
        "course_catalog.etl.loaders.load_course_blocklist", return_value=[]
    )


@pytest.fixture(autouse=True)
def mock_duplicates(mocker):
    """Mock the load_course_duplicates function"""
    return mocker.patch(
        "course_catalog.etl.loaders.load_course_duplicates", return_value=[]
    )


@pytest.fixture(autouse=True)
def mock_tasks(mocker):
    """Mock out course_catalog tasks"""
    return SimpleNamespace(
        get_video_topics=mocker.patch("course_catalog.tasks.get_video_topics")
    )


@pytest.fixture(autouse=True)
def mock_upsert_tasks(mocker):
    """Mock out the upsert task helpers"""
    return SimpleNamespace(
        upsert_course=mocker.patch("search.task_helpers.upsert_course"),
        delete_course=mocker.patch("search.task_helpers.delete_course"),
        upsert_program=mocker.patch("search.task_helpers.upsert_program"),
        delete_program=mocker.patch("search.task_helpers.delete_program"),
        upsert_video=mocker.patch("search.task_helpers.upsert_video"),
        delete_video=mocker.patch("search.task_helpers.delete_video"),
        delete_user_list=mocker.patch("search.task_helpers.delete_user_list"),
        upsert_user_list=mocker.patch("search.task_helpers.upsert_user_list"),
        upsert_podcast=mocker.patch("search.task_helpers.upsert_podcast"),
        upsert_podcast_episode=mocker.patch(
            "search.task_helpers.upsert_podcast_episode"
        ),
        delete_podcast=mocker.patch("search.task_helpers.delete_podcast"),
        delete_podcast_episode=mocker.patch(
            "search.task_helpers.delete_podcast_episode"
        ),
    )


@pytest.mark.parametrize("program_exists", [True, False])
@pytest.mark.parametrize("is_published", [True, False])
@pytest.mark.parametrize("courses_exist", [True, False])
@pytest.mark.parametrize("has_prices", [True, False])
@pytest.mark.parametrize("has_retired_course", [True, False])
def test_load_program(
    mock_upsert_tasks,
    program_exists,
    is_published,
    courses_exist,
    has_prices,
    has_retired_course,
):  # pylint: disable=too-many-arguments
    """Test that load_program loads the program"""
    program = (
        ProgramFactory.create(published=is_published, runs=[])
        if program_exists
        else ProgramFactory.build(published=is_published, runs=[])
    )
    courses = (
        CourseFactory.create_batch(2, platform="fake-platform")
        if courses_exist
        else CourseFactory.build_batch(2, platform="fake-platform")
    )
    prices = CoursePriceFactory.build_batch(2) if has_prices else []

    before_course_count = len(courses) if courses_exist else 0
    after_course_count = len(courses)

    if program_exists and has_retired_course:
        course = CourseFactory.create(platform="fake-platform")
        before_course_count += 1
        after_course_count += 1
        ProgramItem.objects.create(
            program=program,
            content_type=ContentType.objects.get(model="course"),
            object_id=course.id,
            position=1,
        )
        assert program.items.count() == 1
    else:
        assert program.items.count() == 0

    assert Program.objects.count() == (1 if program_exists else 0)
    assert Course.objects.count() == before_course_count

    run_data = {
        "prices": [
            {
                "price": price.price,
                "mode": price.mode,
                "upgrade_deadline": price.upgrade_deadline,
            }
            for price in prices
        ],
        "platform": PlatformType.mitx.value,
        "run_id": program.program_id,
        "enrollment_start": "2017-01-01T00:00:00Z",
        "start_date": "2017-01-20T00:00:00Z",
        "end_date": "2017-06-20T00:00:00Z",
        "best_start_date": "2017-06-20T00:00:00Z",
        "best_end_date": "2017-06-20T00:00:00Z",
    }

    result = load_program(
        {
            "program_id": program.program_id,
            "title": program.title,
            "url": program.url,
            "image_src": program.image_src,
            "published": is_published,
            "runs": [run_data],
            "courses": [
                {"course_id": course.course_id, "platform": course.platform}
                for course in courses
            ],
        },
        [],
        [],
    )

    if program_exists and not is_published:
        mock_upsert_tasks.delete_program.assert_called_with(result)
    elif is_published:
        mock_upsert_tasks.upsert_program.assert_called_with(result.id)
    else:
        mock_upsert_tasks.delete_program.assert_not_called()
        mock_upsert_tasks.upsert_program.assert_not_called()

    assert Program.objects.count() == 1
    assert Course.objects.count() == after_course_count

    # assert we got a program back and that each course is in a program
    assert isinstance(result, Program)
    assert result.items.count() == len(courses)
    assert result.runs.count() == 1
    assert result.runs.first().prices.count() == len(prices)
    assert sorted(
        [
            (price.price, price.mode, price.upgrade_deadline)
            for price in result.runs.first().prices.all()
        ]
    ) == sorted([(price.price, price.mode, price.upgrade_deadline) for price in prices])

    assert result.runs.first().best_start_date == _parse_datetime(
        run_data["best_start_date"]
    )

    for item, data in zip(
        sorted(result.items.all(), key=lambda item: item.item.course_id),
        sorted(courses, key=lambda course: course.course_id),
    ):
        course = item.item
        assert isinstance(course, Course)
        assert course.course_id == data.course_id


@pytest.mark.parametrize("course_exists", [True, False])
@pytest.mark.parametrize("is_published", [True, False])
@pytest.mark.parametrize("is_run_published", [True, False])
@pytest.mark.parametrize("blocklisted", [True, False])
def test_load_course(
    mocker, mock_upsert_tasks, course_exists, is_published, is_run_published, blocklisted
):
    """Test that load_course loads the course"""
    mock_delete_files = mocker.patch("course_catalog.etl.loaders.search_task_helpers.delete_run_content_files")
    course = (
        CourseFactory.create(runs=None, published=is_published)
        if course_exists
        else CourseFactory.build()
    )
    if course_exists:
        run = LearningResourceRunFactory.create(platform=course.platform, content_object=course, published=True)
        LearningResourceRunFactory.create(platform=course.platform, content_object=course, published=True)
    else:
        run = LearningResourceRunFactory.build(platform=course.platform)
    assert Course.objects.count() == (1 if course_exists else 0)

    props = model_to_dict(
        CourseFactory.build(
            course_id=course.course_id, platform=course.platform, published=is_published
        )
    )
    del props["id"]
    if is_run_published:
        run = model_to_dict(run)
        del run["content_type"]
        del run["object_id"]
        del run["id"]
        del run["topics"]
        del run["prices"]
        del run["instructors"]
        props["runs"] = [run]
    else:
        props["runs"] = []

    blocklist = [course.course_id] if blocklisted else []

    result = load_course(props, blocklist, [], config=CourseLoaderConfig(prune=True))

    if course_exists and (not is_published or not is_run_published) and not blocklisted:
        mock_upsert_tasks.delete_course.assert_called_with(result)
    elif is_published and is_run_published and not blocklisted:
        mock_upsert_tasks.upsert_course.assert_called_with(result.id)
    else:
        mock_upsert_tasks.delete_program.assert_not_called()
        mock_upsert_tasks.upsert_course.assert_not_called()
    if course_exists and is_published and not blocklisted:
        course.refresh_from_db()
        assert course.runs.first().published is is_run_published
        assert course.published == (is_published and is_run_published)
        assert mock_delete_files.call_count == (1 if course.published else 0)

    assert Course.objects.count() == 1
    assert LearningResourceRun.objects.count() == (2 if course_exists else 1 if is_run_published else 0)

    # assert we got a course back
    assert isinstance(result, Course)

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"


@pytest.mark.parametrize("course_exists", [True, False])
@pytest.mark.parametrize("course_id_is_duplicate", [True, False])
@pytest.mark.parametrize("duplicate_course_exists", [True, False])
def test_load_duplicate_course(
    mock_upsert_tasks, course_exists, course_id_is_duplicate, duplicate_course_exists
):
    """Test that load_course loads the course"""
    course = CourseFactory.create(runs=None) if course_exists else CourseFactory.build()

    duplicate_course = (
        CourseFactory.create(runs=None, platform=course.platform)
        if duplicate_course_exists
        else CourseFactory.build()
    )

    if course_exists and duplicate_course_exists:
        assert Course.objects.count() == 2
    elif course_exists or duplicate_course_exists:
        assert Course.objects.count() == 1
    else:
        assert Course.objects.count() == 0

    assert LearningResourceRun.objects.count() == 0

    duplicates = [
        {
            "course_id": course.course_id,
            "duplicate_course_ids": [course.course_id, duplicate_course.course_id],
        }
    ]

    course_id = (
        duplicate_course.course_id if course_id_is_duplicate else course.course_id
    )

    props = model_to_dict(
        CourseFactory.build(course_id=course_id, platform=course.platform)
    )

    del props["id"]
    run = model_to_dict(LearningResourceRunFactory.build(platform=course.platform))
    del run["content_type"]
    del run["object_id"]
    del run["id"]
    props["runs"] = [run]

    result = load_course(props, [], duplicates)

    if course_id_is_duplicate and duplicate_course_exists:
        mock_upsert_tasks.delete_course.assert_called()

    mock_upsert_tasks.upsert_course.assert_called_with(result.id)

    assert Course.objects.count() == (2 if duplicate_course_exists else 1)

    assert LearningResourceRun.objects.count() == 1

    # assert we got a course back
    assert isinstance(result, Course)

    saved_course = Course.objects.filter(course_id=course.course_id).first()

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"
        assert (
            getattr(saved_course, key) == value
        ), f"Property {key} should be updated to {value} in the database"


@pytest.mark.parametrize(
    "platform, load_content",
    [[PlatformType.ocw.value, True], [PlatformType.xpro.value, False]],
)
@pytest.mark.parametrize("run_exists", [True, False])
def test_load_run(mocker, run_exists, platform, load_content):
    """Test that load_run loads the course run"""
    mock_load_content_files = mocker.patch(
        "course_catalog.etl.loaders.load_content_files"
    )
    course = CourseFactory.create(runs=None, platform=platform)
    learning_resource_run = (
        LearningResourceRunFactory.create(content_object=course, platform=platform)
        if run_exists
        else LearningResourceRunFactory.build(platform=platform)
    )

    props = model_to_dict(
        LearningResourceRunFactory.build(
            run_id=learning_resource_run.run_id, platform=learning_resource_run.platform
        )
    )
    del props["content_type"]
    del props["object_id"]
    del props["id"]

    assert LearningResourceRun.objects.count() == (1 if run_exists else 0)

    result = load_run(course, props)

    assert LearningResourceRun.objects.count() == 1

    assert result.content_object == course

    # assert we got a course run back
    assert isinstance(result, LearningResourceRun)

    assert mock_load_content_files.call_count == (1 if load_content else 0)

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"


@pytest.mark.parametrize(
    "parent_factory", [CourseFactory, ProgramFactory, LearningResourceRunFactory]
)
@pytest.mark.parametrize("topics_exist", [True, False])
def test_load_topics(parent_factory, topics_exist):
    """Test that load_topics creates and/or assigns topics to the parent object"""
    topics = (
        CourseTopicFactory.create_batch(3)
        if topics_exist
        else CourseTopicFactory.build_batch(3)
    )
    parent = parent_factory.create(no_topics=True)

    assert parent.topics.count() == 0

    load_topics(parent, [{"name": topic.name} for topic in topics])

    assert parent.topics.count() == len(topics)

    load_topics(parent, None)

    assert parent.topics.count() == len(topics)

    load_topics(parent, [])

    assert parent.topics.count() == 0


@pytest.mark.parametrize("prices_exist", [True, False])
def test_load_prices(prices_exist):
    """Test that load_prices creates and/or assigns prices to the parent object"""
    prices = (
        CoursePriceFactory.create_batch(3)
        if prices_exist
        else CoursePriceFactory.build_batch(3)
    )
    course_run = LearningResourceRunFactory.create(no_prices=True)

    assert course_run.prices.count() == 0

    load_prices(
        course_run,
        [
            {
                "price": price.price,
                "mode": price.mode,
                "upgrade_deadline": price.upgrade_deadline,
            }
            for price in prices
        ],
    )

    assert course_run.prices.count() == len(prices)


@pytest.mark.parametrize("instructor_exists", [True, False])
def test_load_instructors(instructor_exists):
    """Test that load_instructors creates and/or assigns instructors to the course run"""
    instructors = (
        CourseInstructorFactory.create_batch(3)
        if instructor_exists
        else CourseInstructorFactory.build_batch(3)
    )
    run = LearningResourceRunFactory.create(no_instructors=True)

    assert run.instructors.count() == 0

    load_instructors(
        run, [{"full_name": instructor.full_name} for instructor in instructors]
    )

    assert run.instructors.count() == len(instructors)


@pytest.mark.parametrize(
    "parent_factory", [CourseFactory, ProgramFactory, LearningResourceRunFactory]
)
@pytest.mark.parametrize("offeror_exists", [True, False])
@pytest.mark.parametrize("has_other_offered_by", [True, False])
@pytest.mark.parametrize("additive", [True, False])
@pytest.mark.parametrize("null_data", [True, False])
def test_load_offered_bys(
    parent_factory, offeror_exists, has_other_offered_by, additive, null_data
):
    """Test that load_offered_bys creates and/or assigns offeror to the parent object"""
    xpro_offeror = (
        LearningResourceOfferorFactory.create(is_xpro=True)
        if offeror_exists
        else LearningResourceOfferorFactory.build(is_xpro=True)
    )
    mitx_offeror = LearningResourceOfferorFactory.create(is_mitx=True)
    parent = parent_factory.create(no_topics=True)

    expected = []

    if not null_data:
        expected.append(xpro_offeror.name)

    if has_other_offered_by and (additive or null_data):
        expected.append(mitx_offeror.name)

    if has_other_offered_by:
        parent.offered_by.set([mitx_offeror])

    assert parent.offered_by.count() == (1 if has_other_offered_by else 0)

    load_offered_bys(
        parent,
        None if null_data else [{"name": xpro_offeror.name}],
        config=OfferedByLoaderConfig(additive=additive),
    )

    assert set(parent.offered_by.values_list("name", flat=True)) == set(expected)


@pytest.mark.parametrize("video_exists", [True, False])
@pytest.mark.parametrize("is_published", [True, False])
@pytest.mark.parametrize("pass_topics", [True, False])
def test_load_video(mock_upsert_tasks, video_exists, is_published, pass_topics):
    """Test that load_video loads the video"""
    video = (
        VideoFactory.create(published=is_published)
        if video_exists
        else VideoFactory.build()
    )
    topics = CourseTopicFactory.create_batch(3) if video_exists else []
    passed_topics = CourseTopicFactory.create_batch(1)
    loading_topics = [{"name": topic.name} for topic in passed_topics]
    expected_topics = passed_topics if pass_topics else topics
    if video_exists:
        video.topics.set(topics)

    assert Video.objects.count() == (1 if video_exists else 0)

    props = model_to_dict(
        VideoFactory.build(
            video_id=video.video_id, platform=video.platform, published=is_published
        )
    )
    del props["id"]
    if pass_topics:
        props["topics"] = loading_topics
    else:
        del props["topics"]

    result = load_video(props)

    if video_exists and not is_published:
        mock_upsert_tasks.delete_video.assert_called_with(result)
    elif is_published:
        mock_upsert_tasks.upsert_video.assert_called_with(result.id)
    else:
        mock_upsert_tasks.delete_video.assert_not_called()
        mock_upsert_tasks.upsert_video.assert_not_called()

    assert Video.objects.count() == 1

    # assert we got a course back
    assert isinstance(result, Video)

    assert list(result.topics.all()) == expected_topics

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"


def test_load_videos():
    """Verify that load_videos loads a list of videos"""
    assert Video.objects.count() == 0

    videos_records = VideoFactory.build_batch(5, published=True)
    videos_data = [model_to_dict(video) for video in videos_records]

    results = load_videos(videos_data)

    assert len(results) == len(videos_records)

    assert Video.objects.count() == len(videos_records)


def test_load_playlist(mock_tasks):
    """Test load_playlist"""
    channel = VideoChannelFactory.create(playlists=None)
    playlist = PlaylistFactory.build()
    assert Playlist.objects.count() == 0
    assert Video.objects.count() == 0

    videos_records = VideoFactory.build_batch(5, published=True)
    videos_data = [model_to_dict(video) for video in videos_records]

    props = model_to_dict(playlist)

    del props["id"]
    del props["channel"]
    props["videos"] = videos_data

    result = load_playlist(channel, props)

    assert isinstance(result, Playlist)

    assert result.videos.count() == len(videos_records)
    assert result.channel == channel

    mock_tasks.get_video_topics.delay.assert_called_once_with(
        video_ids=list(result.videos.order_by("id").values_list("id", flat=True))
    )


def test_load_playlists_unpublish():
    """Test load_playlists when a video/playlist gets unpublished"""
    channel = VideoChannelFactory.create()

    userlist1 = UserListFactory.create()
    userlist2 = UserListFactory.create()

    playlist1 = PlaylistFactory.create(
        channel=channel, published=True, has_user_list=True, user_list=userlist1
    )
    playlist2 = PlaylistFactory.create(
        channel=channel, published=True, has_user_list=True, user_list=userlist2
    )
    playlist3 = PlaylistFactory.create(
        channel=channel, published=True, has_user_list=True, user_list=None
    )
    playlist4 = PlaylistFactory.create(
        channel=channel, published=True, has_user_list=False, user_list=None
    )

    playlists_data = [
        {
            "playlist_id": playlist1.playlist_id,
            "platform": playlist1.platform,
            "videos": [],
        }
    ]

    load_playlists(channel, playlists_data)

    playlist1.refresh_from_db()
    playlist2.refresh_from_db()
    playlist3.refresh_from_db()
    playlist4.refresh_from_db()

    assert playlist1.published is True
    assert playlist1.has_user_list is True

    assert playlist2.published is False
    assert playlist2.has_user_list is False

    assert playlist3.published is False
    assert playlist3.has_user_list is False

    assert playlist4.published is False
    assert playlist4.has_user_list is False

    assert UserList.objects.filter(id=userlist1.id).count() == 1
    assert UserList.objects.filter(id=userlist2.id).count() == 0


def test_load_video_channels():
    """Test load_video_channels"""
    assert VideoChannel.objects.count() == 0
    assert Playlist.objects.count() == 0

    channels_data = []
    for channel in VideoChannelFactory.build_batch(3):
        channel_data = model_to_dict(channel)
        del channel_data["id"]

        playlist = PlaylistFactory.build()
        playlist_data = model_to_dict(playlist)
        del playlist_data["id"]
        del playlist_data["channel"]

        channel_data["playlists"] = [playlist_data]
        channels_data.append(channel_data)

    results = load_video_channels(channels_data)

    assert len(results) == len(channels_data)

    for result in results:
        assert isinstance(result, VideoChannel)

        assert result.playlists.count() == 1


def test_load_video_channels_error(mocker):
    """Test that an error doesn't fail the entire operation"""

    def pop_channel_id_with_exception(data):
        """Pop channel_id off data and raise an exception"""
        data.pop("channel_id")
        raise ExtractException()

    mock_load_channel = mocker.patch("course_catalog.etl.loaders.load_video_channel")
    mock_load_channel.side_effect = pop_channel_id_with_exception
    mock_log = mocker.patch("course_catalog.etl.loaders.log")
    channel_id = "abc"

    load_video_channels([{"channel_id": channel_id}])

    mock_log.exception.assert_called_once_with(
        "Error with extracted video channel: channel_id=%s", channel_id
    )


def test_load_video_channels_unpublish(mock_upsert_tasks):
    """Test load_video_channels when a video/playlist gets unpublished"""
    channel = VideoChannelFactory.create()
    playlist = PlaylistFactory.create(channel=channel, published=True)
    video = VideoFactory.create()
    PlaylistVideo.objects.create(playlist=playlist, video=video, position=0)
    unpublished_playlist = PlaylistFactory.create(channel=channel, published=False)
    unpublished_video = VideoFactory.create()
    PlaylistVideo.objects.create(
        playlist=unpublished_playlist, video=unpublished_video, position=0
    )

    # inputs don't matter here
    load_video_channels([])

    video.refresh_from_db()
    unpublished_video.refresh_from_db()
    assert video.published is True
    assert unpublished_video.published is False

    mock_upsert_tasks.delete_video.assert_called_once_with(unpublished_video)


def test_load_playlist_user_list_invalid_settings(mocker, settings):
    """Verify load_playlist_user_list aborts if the settings are invalid"""
    mock_log = mocker.patch("course_catalog.etl.loaders.log")

    settings.OPEN_VIDEO_USER_LIST_OWNER = None

    assert load_playlist_user_list(mocker.Mock(), None) is None

    mock_log.debug.assert_called_once_with(
        "OPEN_VIDEO_USER_LIST_OWNER is not set, skipping"
    )

    settings.OPEN_VIDEO_USER_LIST_OWNER = "missing"

    assert load_playlist_user_list(mocker.Mock(), None) is None

    mock_log.error.assert_called_once_with(
        "OPEN_VIDEO_USER_LIST_OWNER is set to '%s', but that user doesn't exist",
        settings.OPEN_VIDEO_USER_LIST_OWNER,
    )


@pytest.mark.parametrize("exists", [True, False])
@pytest.mark.parametrize("has_user_list", [True, False])
@pytest.mark.parametrize("user_list_title", ["Title", None])
def test_load_playlist_user_list(
    mock_upsert_tasks, settings, user, exists, has_user_list, user_list_title
):
    # pylint: disable=too-many-arguments
    """Test that load_playlist_user_list updates or create the user list"""

    settings.OPEN_VIDEO_USER_LIST_OWNER = user.username

    playlist = PlaylistFactory.create(has_user_list=has_user_list)
    videos = VideoFactory.create_batch(3)
    for idx, video in enumerate(videos):
        PlaylistVideo.objects.create(playlist=playlist, video=video, position=idx)

    prune_video = VideoFactory.create()
    video_content_type = ContentType.objects.get_for_model(Video)
    user_list = None

    if exists:
        user_list = UserListFactory.create(is_list=True, is_public=True, author=user)
        UserListItem.objects.create(
            user_list=user_list,
            content_type=video_content_type,
            object_id=prune_video.id,
            position=0,
        )

        playlist.user_list = user_list
        playlist.save()
    else:
        assert playlist.user_list is None

    load_playlist_user_list(playlist, user_list_title)

    playlist.refresh_from_db()

    if has_user_list:
        if exists:
            assert playlist.user_list == user_list
        else:
            assert playlist.user_list is not None

        user_list = playlist.user_list

        assert user_list.author == user

        if user_list_title:
            assert user_list.title == user_list_title
        else:
            assert user_list.title == playlist.title

        assert user_list.privacy_level == PrivacyLevel.public.value
        assert user_list.list_type == UserListType.LIST.value

        assert (
            UserListItem.objects.filter(
                user_list=user_list,
                content_type=video_content_type,
                object_id=prune_video.id,
            ).exists()
            is False
        )

        for video in videos:
            assert (
                UserListItem.objects.filter(
                    user_list=user_list,
                    content_type=video_content_type,
                    object_id=video.id,
                ).exists()
                is True
            )
        mock_upsert_tasks.upsert_user_list.assert_called_once_with(user_list.id)
    else:
        assert playlist.user_list is None

        if exists:
            mock_upsert_tasks.delete_user_list.assert_called_once_with(user_list)
        else:
            mock_upsert_tasks.delete_user_list.assert_not_called()


@pytest.mark.parametrize("prune", [True, False])
def test_load_courses(mocker, mock_blocklist, mock_duplicates, prune):
    """Test that load_courses calls the expected functions"""
    course_to_unpublish = CourseFactory.create()
    courses = CourseFactory.create_batch(3, platform=course_to_unpublish.platform)
    courses_data = [{"course_id": course.course_id} for course in courses]
    mock_load_course = mocker.patch(
        "course_catalog.etl.loaders.load_course", autospec=True, side_effect=courses
    )
    config = CourseLoaderConfig(prune=prune)
    load_courses(course_to_unpublish.platform, courses_data, config=config)
    assert mock_load_course.call_count == len(courses)
    for course_data in courses_data:
        mock_load_course.assert_any_call(
            course_data,
            mock_blocklist.return_value,
            mock_duplicates.return_value,
            config=config,
        )
    mock_blocklist.assert_called_once_with()
    mock_duplicates.assert_called_once_with(course_to_unpublish.platform)
    course_to_unpublish.refresh_from_db()
    assert course_to_unpublish.published is not prune


def test_load_programs(mocker, mock_blocklist, mock_duplicates):
    """Test that load_programs calls the expected functions"""
    program_data = [{"courses": [{"platform": "a"}, {}]}]
    mock_load_program = mocker.patch(
        "course_catalog.etl.loaders.load_program", autospec=True
    )
    load_programs("mitx", program_data)
    assert mock_load_program.call_count == len(program_data)
    mock_blocklist.assert_called_once()
    mock_duplicates.assert_called_once_with("mitx")


@pytest.mark.parametrize("is_published", [True, False])
def test_load_content_files(mocker, is_published):
    """Test that load_content_files calls the expected functions"""
    course_run = LearningResourceRunFactory.create(published=is_published)

    returned_content_file_id = 1

    content_data = [{"a": "b"}, {"a": "c"}]
    mock_load_content_file = mocker.patch(
        "course_catalog.etl.loaders.load_content_file",
        return_value=returned_content_file_id,
        autospec=True,
    )
    mock_bulk_index = mocker.patch(
        "course_catalog.etl.loaders.search_task_helpers.index_run_content_files",
        autospec=True,
    )
    mock_bulk_delete = mocker.patch(
        "course_catalog.etl.loaders.search_task_helpers.delete_run_content_files",
        autospec=True,
    )
    load_content_files(course_run, content_data)
    assert mock_load_content_file.call_count == len(content_data)
    assert mock_bulk_index.call_count == (1 if is_published else 0)
    assert mock_bulk_delete.call_count == (0 if is_published else 1)


def test_load_content_file():
    """Test that load_content_file saves a ContentFile object"""
    learning_resource_run = LearningResourceRunFactory.create()

    props = model_to_dict(ContentFileFactory.build(run_id=learning_resource_run.id))
    props.pop("run")
    props.pop("id")

    result = load_content_file(learning_resource_run, props)

    assert ContentFile.objects.count() == 1

    # assert we got an integer back
    assert isinstance(result, int)

    loaded_file = ContentFile.objects.get(pk=result)
    assert loaded_file.run == learning_resource_run

    for key, value in props.items():
        assert (
            getattr(loaded_file, key) == value
        ), f"Property {key} should equal {value}"


def test_load_content_file_error(mocker):
    """Test that an exception in load_content_file is logged"""
    learning_resource_run = LearningResourceRunFactory.create()
    mock_log = mocker.patch("course_catalog.etl.loaders.log.exception")
    load_content_file(learning_resource_run, {"uid": "badfile", "bad": "data"})
    mock_log.assert_called_once_with(
        "ERROR syncing course file %s for run %d", "badfile", learning_resource_run.id
    )


def test_load_podcasts():
    """Test load_podcasts"""
    assert Podcast.objects.count() == 0

    podcasts_data = []
    for podcast in PodcastFactory.build_batch(3):
        podcast_data = model_to_dict(podcast)
        del podcast_data["id"]

        podcasts_data.append(podcast_data)

    results = load_podcasts(podcasts_data)

    assert len(results) == len(podcasts_data)

    for result in results:
        assert isinstance(result, Podcast)


def test_load_podcasts_unpublish():
    """Test load_podcast when a podcast gets unpublished"""
    podcast = PodcastFactory.create(published=True)
    podcast_episode = PodcastEpisodeFactory.create(podcast=podcast, published=True)

    load_podcasts([])

    podcast.refresh_from_db()
    podcast_episode.refresh_from_db()

    assert podcast.published is False
    assert podcast_episode.published is False


@pytest.mark.parametrize("podcast_episode_exists", [True, False])
@pytest.mark.parametrize("is_published", [True, False])
def test_load_podcast_episode(mock_upsert_tasks, podcast_episode_exists, is_published):
    """Test that load_podcast_episode loads the podcast episode"""
    podcast = PodcastFactory.create()
    podcast_episode = (
        PodcastEpisodeFactory.create(podcast=podcast, published=is_published)
        if podcast_episode_exists
        else PodcastEpisodeFactory.build(podcast=podcast, published=is_published)
    )

    props = model_to_dict(podcast_episode)
    topics = (
        podcast_episode.topics.all()
        if podcast_episode_exists
        else CourseTopicFactory.build_batch(2)
    )
    props["topics"] = [model_to_dict(topic) for topic in topics]
    del props["id"]
    del props["podcast"]

    result = load_podcast_episode(props, podcast)

    assert PodcastEpisode.objects.count() == 1

    # assert we got a podcast episode back
    assert isinstance(result, PodcastEpisode)

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"

    if podcast_episode_exists and not is_published:
        mock_upsert_tasks.delete_podcast_episode.assert_called_with(result)
    elif is_published:
        mock_upsert_tasks.upsert_podcast_episode.assert_called_with(result.id)
    else:
        mock_upsert_tasks.delete_podcast_episode.assert_not_called()
        mock_upsert_tasks.upsert_podcast_episode.assert_not_called()


@pytest.mark.parametrize("podcast_exists", [True, False])
@pytest.mark.parametrize("is_published", [True, False])
def test_load_podcast(mock_upsert_tasks, podcast_exists, is_published):
    """Test that load_podcast loads the podcast"""
    podcast = (
        PodcastFactory.create(published=is_published)
        if podcast_exists
        else PodcastFactory.build(published=is_published)
    )
    existing_podcast_episode = (
        PodcastEpisodeFactory.create(podcast=podcast, published=is_published)
        if podcast_exists
        else None
    )

    podcast_data = model_to_dict(podcast)
    podcast_data["title"] = "New Title"
    topics = (
        podcast.topics.all() if podcast_exists else CourseTopicFactory.build_batch(2)
    )
    podcast_data["topics"] = [model_to_dict(topic) for topic in topics]
    del podcast_data["id"]

    episode_data = model_to_dict(PodcastEpisodeFactory.build(podcast=podcast))
    del episode_data["id"]
    del episode_data["podcast"]

    podcast_data["episodes"] = [episode_data]
    result = load_podcast(podcast_data)

    podcast = Podcast.objects.get(podcast_id=podcast.podcast_id)
    new_podcast_episode = podcast.episodes.order_by("-created_on").first()

    assert podcast.title == "New Title"
    assert new_podcast_episode.published is True
    if podcast_exists:
        existing_podcast_episode.refresh_from_db()
        assert existing_podcast_episode.published is False
        mock_upsert_tasks.delete_podcast_episode.assert_called_with(
            existing_podcast_episode
        )

    if podcast_exists and not is_published:
        mock_upsert_tasks.delete_podcast.assert_called_with(result)
    elif is_published:
        mock_upsert_tasks.upsert_podcast.assert_called_with(result.id)
    else:
        mock_upsert_tasks.delete_podcast.assert_not_called()
        mock_upsert_tasks.upsert_podcast.assert_not_called()
