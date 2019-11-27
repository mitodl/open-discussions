"""Course catalog data loaders"""
import logging

from django.conf import settings
from django.db import transaction
from django.db.models import OuterRef, Exists
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PrivacyLevel, ListType
from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    LearningResourceRun,
    LearningResourceOfferor,
    Program,
    ProgramItem,
    Video,
    VideoChannel,
    Playlist,
    PlaylistVideo,
    UserList,
    UserListItem,
)
from course_catalog.etl.exceptions import ExtractException
from course_catalog.etl.utils import log_exceptions

from search import task_helpers as search_task_helpers

log = logging.getLogger()

User = get_user_model()


def load_topics(resource, topics_data):
    """Load the topics for a resource into the database"""
    topics = []

    for topic_data in topics_data:
        topic, _ = CourseTopic.objects.get_or_create(name=topic_data["name"])
        topics.append(topic)

    resource.topics.set(topics)
    resource.save()
    return topics


def load_prices(resource, prices_data):
    """Load the prices for a resource into the database"""
    prices = []

    for price_data in prices_data:
        price, _ = CoursePrice.objects.get_or_create(
            price=price_data.get("price", ""),
            mode=price_data.get("mode", ""),
            upgrade_deadline=price_data.get("upgrade_deadline", None),
        )
        prices.append(price)

    resource.prices.set(prices)
    resource.save()
    return prices


def load_instructors(resource, instructors_data):
    """Load the prices for a resource into the database"""
    instructors = []

    for instructor_data in instructors_data:
        instructor, _ = CourseInstructor.objects.get_or_create(**instructor_data)
        instructors.append(instructor)

    resource.instructors.set(instructors)
    resource.save()
    return instructors


def load_offered_bys(resource, offered_bys_data):
    """Loads a list of offered_by into the resource. This operation is additive-only."""
    offered_bys = []

    for offered_by_data in offered_bys_data:
        offered_by, _ = LearningResourceOfferor.objects.get_or_create(
            name=offered_by_data["name"]
        )
        resource.offered_by.add(offered_by)

    resource.save()
    return offered_bys


def load_run(learning_resource, course_run_data):
    """Load the course run into the database"""
    run_id = course_run_data.pop("run_id")
    platform = course_run_data.get("platform")
    instructors_data = course_run_data.pop("instructors", [])
    prices_data = course_run_data.pop("prices", [])
    topics_data = course_run_data.pop("topics", [])
    offered_bys_data = course_run_data.pop("offered_by", [])

    learning_resource_run, _ = LearningResourceRun.objects.update_or_create(
        run_id=run_id,
        platform=platform,
        defaults={
            **course_run_data,
            "object_id": learning_resource.id,
            "content_type": ContentType.objects.get_for_model(learning_resource),
        },
    )

    load_topics(learning_resource_run, topics_data)
    load_prices(learning_resource_run, prices_data)
    load_instructors(learning_resource_run, instructors_data)
    load_offered_bys(learning_resource_run, offered_bys_data)

    return learning_resource_run


def load_course(course_data):
    """Load the course into the database"""
    course_id = course_data.pop("course_id")
    platform = course_data.get("platform")
    runs_data = course_data.pop("runs", [])
    topics_data = course_data.pop("topics", [])
    offered_bys_data = course_data.pop("offered_by", [])

    course, created = Course.objects.update_or_create(
        platform=platform, course_id=course_id, defaults=course_data
    )

    load_topics(course, topics_data)
    load_offered_bys(course, offered_bys_data)

    for course_run_data in runs_data:
        load_run(course, course_run_data)

    if not created and not course.published:
        search_task_helpers.delete_course(course)
    elif course.published:
        search_task_helpers.upsert_course(course)

    return course


@log_exceptions("Error loading courses")
def load_courses(courses_data):
    """Load a list of programs"""
    return [load_course(course_data) for course_data in courses_data]


@log_exceptions("Error loading program")
def load_program(program_data):
    """Load the program into the database"""
    program_id = program_data.pop("program_id")
    courses_data = program_data.pop("courses")
    topics_data = program_data.pop("topics", [])
    runs_data = program_data.pop("runs", [])
    offered_bys_data = program_data.pop("offered_by", [])

    program, created = Program.objects.update_or_create(
        program_id=program_id, defaults=program_data
    )

    load_topics(program, topics_data)
    load_offered_bys(program, offered_bys_data)

    for run_data in runs_data:
        load_run(program, run_data)

    courses = []
    course_content_type = ContentType.objects.get(model="course")

    for position, course_data in enumerate(courses_data):
        # skip courses that don't define a course_id
        if not course_data.get("course_id", None):
            continue

        course = load_course(course_data)
        courses.append(course)

        # create a program item or update its position
        ProgramItem.objects.update_or_create(
            program=program,
            content_type=course_content_type,
            object_id=course.id,
            defaults={"position": position},
        )

    # remove courses from the program that are no longer
    program.items.filter(content_type=course_content_type).exclude(
        object_id__in=[course.id for course in courses]
    ).delete()

    if not created and not program.published:
        search_task_helpers.delete_program(program)
    elif program.published:
        search_task_helpers.upsert_program(program)

    return program


def load_programs(programs_data):
    """Load a list of programs"""
    return [load_program(program_data) for program_data in programs_data]


def load_video(video_data):
    """Load a video into the database"""
    video_id = video_data.pop("video_id")
    platform = video_data.pop("platform")
    topics_data = video_data.pop("topics", [])
    offered_bys_data = video_data.pop("offered_by", [])
    runs_data = video_data.pop("runs", [])

    video, created = Video.objects.update_or_create(
        video_id=video_id, platform=platform, defaults=video_data
    )

    load_topics(video, topics_data)
    load_offered_bys(video, offered_bys_data)

    for run_data in runs_data:
        load_run(video, run_data)

    if not created and not video.published:
        # NOTE: if we didn't see a video in a playlist, it is likely NOT being removed here
        #       this gets addressed in load_channels after everything has been synced
        search_task_helpers.delete_video(video)
    elif video.published:
        search_task_helpers.upsert_video(video)

    return video


def load_videos(videos_data):
    """
    Loads a list of videos data

    Args:
        videos_data (iter of dict): iterable of the video data

    Returns:
        list of Video:
            the list of loaded videos
    """
    return [load_video(video_data) for video_data in videos_data]


def load_playlist_user_list(playlist):
    """
    Load a playlist into a user list

    Args:
        playlist (Playlist): the playlist to generate a user list from

    Returns:
        UserList or None:
            the created/updated user list or None
    """
    owner_username = settings.OPEN_VIDEO_USER_LIST_OWNER
    if not owner_username:
        log.debug("OPEN_VIDEO_USER_LIST_OWNER is not set, skipping")
        return None

    owner = User.objects.filter(username=owner_username).first()
    if owner is None:
        log.error(
            "OPEN_VIDEO_USER_LIST_OWNER is set to '%s', but that user doesn't exist",
            owner_username,
        )
        return None

    if not playlist.has_user_list:
        # if the playlist shouldn't have a user list, but it does, delete it
        if playlist.user_list:
            user_list = playlist.user_list
            search_task_helpers.delete_user_list(user_list)
            user_list.delete()
        return None

    # atomically ensure we create one and only one user list for this playlist
    with transaction.atomic():
        playlist = Playlist.objects.select_for_update().get(id=playlist.id)
        if not playlist.user_list:
            playlist.user_list = UserList.objects.create(
                author=owner,
                privacy_level=PrivacyLevel.public.value,
                list_type=ListType.LIST.value,
            )
            playlist.save()

    user_list = playlist.user_list
    user_list.title = playlist.title
    user_list.save()

    video_content_type = ContentType.objects.get_for_model(Video)

    items = []
    for playlist_video in playlist.playlist_videos.order_by("position"):
        item, _ = UserListItem.objects.update_or_create(
            user_list=user_list,
            content_type=video_content_type,
            object_id=playlist_video.video_id,
            defaults={"position": playlist_video.position},
        )
        items.append(item)

    # prune any items from the previous state
    UserListItem.objects.filter(user_list=user_list).exclude(
        id__in=[item.id for item in items]
    ).delete()

    search_task_helpers.upsert_user_list(user_list)

    return user_list


def load_playlist(video_channel, playlist_data):
    """
    Load a playlist

    Args:
        video_channel (VideoChannel): the video channel instance this playlist is under
        playlist_data (dict): the video playlist

    Returns:
        Playlist:
            the created or updated playlist
    """
    platform = playlist_data.pop("platform")
    playlist_id = playlist_data.pop("playlist_id")
    videos_data = playlist_data.pop("videos", [])
    topics_data = playlist_data.pop("topics", [])
    offered_by_data = playlist_data.pop("offered_by", [])

    playlist, _ = Playlist.objects.update_or_create(
        platform=platform,
        playlist_id=playlist_id,
        defaults={"channel": video_channel, **playlist_data},
    )

    load_topics(playlist, topics_data)
    load_offered_bys(playlist, offered_by_data)

    videos = load_videos(videos_data)

    # atomically remove existing videos in the playlist and add the current ones in bulk
    with transaction.atomic():
        for position, video in enumerate(videos):
            PlaylistVideo.objects.update_or_create(
                playlist=playlist, video=video, defaults={"position": position}
            )
        PlaylistVideo.objects.filter(playlist=playlist).exclude(
            video_id__in=[video.id for video in videos]
        ).delete()

    load_playlist_user_list(playlist)

    from course_catalog import tasks

    tasks.get_video_topics.delay(video_ids=[video.id for video in videos])

    return playlist


def load_playlists(video_channel, playlists_data):
    """
    Load a list of channel playlists

    Args:
        video_channel (VideoChannel): the video channel instance this playlist is under
        playlists_data (iter of dict): iterable of the video playlists


    Returns:
        list of Playlist:
            the created or updated playlists
    """
    playlists = [
        load_playlist(video_channel, playlist_data) for playlist_data in playlists_data
    ]
    playlist_ids = [playlist.id for playlist in playlists]

    # remove playlists that no longer exist
    Playlist.objects.filter(channel=video_channel).exclude(id__in=playlist_ids).update(
        published=False
    )

    return playlists


def load_video_channel(video_channel_data):
    """
    Load a single video channel

    Arg:
        video_channel_data (dict):
            the normalized video channel data
    Returns:
        VideoChannel:
            the updated or created video channel
    """
    platform = video_channel_data.pop("platform")
    channel_id = video_channel_data.pop("channel_id")
    playlists_data = video_channel_data.pop("playlists", [])
    topics_data = video_channel_data.pop("topics", [])
    offered_by_data = video_channel_data.pop("offered_by", [])

    video_channel, _ = VideoChannel.objects.update_or_create(
        platform=platform, channel_id=channel_id, defaults=video_channel_data
    )

    load_topics(video_channel, topics_data)
    load_offered_bys(video_channel, offered_by_data)
    load_playlists(video_channel, playlists_data)

    return video_channel


def load_video_channels(video_channels_data):
    """
    Load a list of video channels

    Args:
        video_channels_data (iter of dict): iterable of the video channels data

    Returns:
        list of VideoChannel:
            list of the loaded videos
    """
    video_channels = []

    # video_channels_data is a generator
    for video_channel_data in video_channels_data:
        channel_id = video_channel_data["channel_id"]
        try:
            video_channel = load_video_channel(video_channel_data)
        except ExtractException:
            # video_channel_data has lazily evaluated generators, one of them could raise an extraction error
            # this is a small pollution of separation of concerns
            # but this allows us to stream the extracted data w/ generators
            # as opposed to having to load everything into memory, which will eventually fail
            log.exception(
                "Error with extracted video channel: channel_id=%s", channel_id
            )
        else:
            video_channels.append(video_channel)

    # unpublish the channels we're no longer tracking
    channel_ids = [channel for channel in video_channels_data]
    VideoChannel.objects.exclude(channel_id__in=channel_ids).update(published=False)

    # finally, unpublish any published videos that aren't in at least one published playlist
    for video in (
        Video.objects.annotate(
            in_published_playlist=Exists(
                PlaylistVideo.objects.filter(
                    video_id=OuterRef("pk"), playlist__published=True
                )
            )
        )
        .filter(published=True)
        .exclude(in_published_playlist=True)
    ):
        # remove it from the index first
        search_task_helpers.delete_video(video)
        video.published = False
        video.save()

    return video_channels
