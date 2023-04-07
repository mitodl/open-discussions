"""Course catalog data loaders"""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Exists, OuterRef

from course_catalog.constants import PrivacyLevel, UserListType, EDX_PLATFORMS
from course_catalog.etl.constants import (
    CourseLoaderConfig,
    LearningResourceRunLoaderConfig,
    OfferedByLoaderConfig,
    PlaylistLoaderConfig,
    PodcastEpisodeLoaderConfig,
    PodcastLoaderConfig,
    ProgramLoaderConfig,
    VideoLoaderConfig,
)
from course_catalog.etl.deduplication import get_most_relevant_run
from course_catalog.etl.exceptions import ExtractException
from course_catalog.models import (
    ContentFile,
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    LearningResourceOfferor,
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
from course_catalog.utils import load_course_blocklist, load_course_duplicates
from search import task_helpers as search_task_helpers
from search.constants import COURSE_TYPE

log = logging.getLogger()

User = get_user_model()


def load_topics(resource, topics_data):
    """Load the topics for a resource into the database"""
    if topics_data is not None:
        topics = []

        for topic_data in topics_data:
            topic, _ = CourseTopic.objects.get_or_create(name=topic_data["name"])
            topics.append(topic)

        resource.topics.set(topics)
        resource.save()
    return resource.topics.all()


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
    """Load the instructors for a resource into the database"""
    instructors = []

    for instructor_data in instructors_data:
        if "full_name" not in instructor_data:
            instructor_data["full_name"] = instructor_data.get("title", None)

        instructor, _ = CourseInstructor.objects.get_or_create(**instructor_data)
        instructors.append(instructor)

    resource.instructors.set(instructors)
    resource.save()
    return instructors


def load_offered_bys(resource, offered_bys_data, *, config=OfferedByLoaderConfig()):
    """
    Loads a list of offered_by into the resource.

    Args:
        resource (LearningResource): learning resource
        offered_bys_data (list of dict): the offered by data for the resource
        config (OfferedByLoaderConfig): loader configuration

    Returns:
        offered_bys (list of LearningResourceOfferor): list of created or updated offered_bys
    """
    if offered_bys_data is None:
        return resource.offered_by.all()

    offered_bys = []

    for offered_by_data in offered_bys_data:
        offered_by, _ = LearningResourceOfferor.objects.get_or_create(
            name=offered_by_data["name"]
        )
        if config.additive:
            resource.offered_by.add(offered_by)
        offered_bys.append(offered_by)

    if not config.additive:
        resource.offered_by.set(offered_bys)

    resource.save()
    return offered_bys


def load_run(learning_resource, run_data, *, config=LearningResourceRunLoaderConfig()):
    """
    Load the resource run into the database

    Args:
        learning_resource (LearningResource): the concrete parent learning resource
        run_data (dict): dictionary of data to create/update the run with
        config (LearningResourceRunLoaderConfig): configuration on how to load this run

    Returns:
        LearningResourceRun: the created/updated resource run
    """
    run_id = run_data.pop("run_id")
    platform = run_data.get("platform")
    instructors_data = run_data.pop("instructors", [])
    prices_data = run_data.pop("prices", [])
    topics_data = run_data.pop("topics", None)
    offered_bys_data = run_data.pop("offered_by", [])
    content_files = run_data.pop("content_files", [])

    with transaction.atomic():
        (
            learning_resource_run,
            _,
        ) = LearningResourceRun.objects.select_for_update().update_or_create(
            run_id=run_id,
            platform=platform,
            defaults={
                **run_data,
                "object_id": learning_resource.id,
                "content_type": ContentType.objects.get_for_model(learning_resource),
            },
        )

        load_topics(learning_resource_run, topics_data)
        load_prices(learning_resource_run, prices_data)
        load_instructors(learning_resource_run, instructors_data)
        load_offered_bys(
            learning_resource_run, offered_bys_data, config=config.offered_by
        )
        if platform not in EDX_PLATFORMS:
            # edx content files should be handled separately
            load_content_files(learning_resource_run, content_files)

    return learning_resource_run


def load_course(course_data, blocklist, duplicates, *, config=CourseLoaderConfig()):
    """
    Load the course into the database

    Args:
        course_data (dict):
            a dict of course data values
        blocklist (list of str):
            list of course ids not to load
        duplicates (list of dict):
            list of duplicate course data
        config (CourseLoaderConfig):
            configuration on how to load this program

    Returns:
        Course:
            the created/updated course
    """
    # pylint: disable=too-many-branches,too-many-locals

    platform = course_data.get("platform")
    course_id = course_data.pop("course_id")
    runs_data = course_data.pop("runs", [])
    topics_data = course_data.pop("topics", None)
    offered_bys_data = course_data.pop("offered_by", [])

    if course_id in blocklist or not runs_data:
        course_data["published"] = False

    deduplicated_course_id = next(
        (
            record["course_id"]
            for record in duplicates
            if course_id in record["duplicate_course_ids"]
        ),
        None,
    )

    with transaction.atomic():
        if deduplicated_course_id:
            # intentionally not updating if the course doesn't exist
            course, created = Course.objects.select_for_update().get_or_create(
                platform=platform,
                course_id=deduplicated_course_id,
                defaults=course_data,
            )

            if course_id != deduplicated_course_id:
                duplicate_course = Course.objects.filter(
                    platform=platform, course_id=course_id
                ).first()
                if duplicate_course:
                    duplicate_course.published = False
                    duplicate_course.save()
                    search_task_helpers.delete_course(duplicate_course)
        else:
            course, created = Course.objects.select_for_update().update_or_create(
                platform=platform, course_id=course_id, defaults=course_data
            )

        run_ids_to_update_or_create = [run["run_id"] for run in runs_data]

        for course_run_data in runs_data:
            load_run(course, course_run_data, config=config.runs)

        if deduplicated_course_id and not created:
            most_relevent_run = get_most_relevant_run(course.runs.all())

            if most_relevent_run.run_id in run_ids_to_update_or_create:
                for attr, val in course_data.items():
                    setattr(course, attr, val)
                course.save()

        unpublished_runs = []
        if config.prune:
            # mark runs no longer included here as unpublished
            for run in course.runs.exclude(
                run_id__in=run_ids_to_update_or_create
            ).filter(published=True):
                run.published = False
                run.save()
                unpublished_runs.append(run.id)

        load_topics(course, topics_data)
        load_offered_bys(course, offered_bys_data, config=config.offered_by)

    if not created and not course.published:
        search_task_helpers.delete_course(course)
    elif course.published:
        search_task_helpers.upsert_course(course.id)
        for run_id in unpublished_runs:
            search_task_helpers.delete_run_content_files(run_id)

    return course


def load_courses(platform, courses_data, *, config=CourseLoaderConfig()):
    """
    Load a list of courses

    Args:
        courses_data (list of dict):
            a list of course data values
        config (CourseLoaderConfig):
            configuration on how to load this program
    """
    blocklist = load_course_blocklist()
    duplicates = load_course_duplicates(platform)

    courses_list = list(courses_data or [])

    courses = [
        load_course(course, blocklist, duplicates, config=config)
        for course in courses_list
    ]

    if courses and config.prune:
        for course in Course.objects.filter(platform=platform).exclude(
            id__in=[course.id for course in courses]
        ):
            course.published = False
            course.save()
            search_task_helpers.delete_course(course)

    return courses


def load_program(program_data, blocklist, duplicates, *, config=ProgramLoaderConfig()):
    """
    Load the program into the database

    Args:
        program_data (dict):
            a dict of program data values
        blocklist (list of str):
            list of course ids not to load
        duplicates (list of dict):
            list of duplicate course data
        config (ProgramLoaderConfig):
            configuration on how to load this program

    Returns:
        Program:
            the created/updated program
    """
    # pylint: disable=too-many-locals

    program_id = program_data.pop("program_id")
    courses_data = program_data.pop("courses")
    topics_data = program_data.pop("topics", [])
    runs_data = program_data.pop("runs", [])
    offered_bys_data = program_data.pop("offered_by", [])

    with transaction.atomic():
        # lock on the program record
        program, created = Program.objects.select_for_update().update_or_create(
            program_id=program_id, defaults=program_data
        )

        load_topics(program, topics_data)
        load_offered_bys(program, offered_bys_data, config=config.offered_by)

        for run_data in runs_data:
            load_run(program, run_data, config=config.runs)

        courses = []
        course_content_type = ContentType.objects.get(model="course")

        for position, course_data in enumerate(courses_data):
            # skip courses that don't define a course_id
            if not course_data.get("course_id", None):
                continue

            course = load_course(
                course_data, blocklist, duplicates, config=config.courses
            )
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
        search_task_helpers.upsert_program(program.id)

    return program


def load_programs(platform, programs_data, *, config=ProgramLoaderConfig()):
    """Load a list of programs"""
    blocklist = load_course_blocklist()
    duplicates = load_course_duplicates(platform)

    return [
        load_program(program_data, blocklist, duplicates, config=config)
        for program_data in programs_data
    ]


def load_video(video_data, *, config=VideoLoaderConfig()):
    """Load a video into the database"""
    video_id = video_data.pop("video_id")
    platform = video_data.pop("platform")
    topics_data = video_data.pop("topics", None)
    offered_bys_data = video_data.pop("offered_by", None)

    with transaction.atomic():
        # lock on the video record
        video, created = Video.objects.select_for_update().update_or_create(
            video_id=video_id, platform=platform, defaults=video_data
        )

        load_topics(video, topics_data)
        load_offered_bys(video, offered_bys_data, config=config.offered_by)

    if not created and not video.published:
        # NOTE: if we didn't see a video in a playlist, it is likely NOT being removed here
        #       this gets addressed in load_channels after everything has been synced
        search_task_helpers.delete_video(video)
    elif video.published:
        search_task_helpers.upsert_video(video.id)

    return video


def load_videos(videos_data, *, config=VideoLoaderConfig()):
    """
    Loads a list of videos data

    Args:
        videos_data (iter of dict): iterable of the video data

    Returns:
        list of Video:
            the list of loaded videos
    """
    return [load_video(video_data, config=config) for video_data in videos_data]


def load_playlist_user_list(playlist, user_list_title):
    """
    Load a playlist into a user list

    Args:
        playlist (Playlist): the playlist to generate a user list from
        user_list_title (str or None): title for the user list
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
                list_type=UserListType.LIST.value,
            )
            playlist.save()

    user_list = playlist.user_list
    user_list.title = user_list_title if user_list_title else playlist.title
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

    search_task_helpers.upsert_user_list(user_list.id)

    return user_list


def load_playlist(video_channel, playlist_data, *, config=PlaylistLoaderConfig()):
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
    user_list_title = playlist_data.pop("user_list_title", None)

    with transaction.atomic():
        playlist, _ = Playlist.objects.update_or_create(
            platform=platform,
            playlist_id=playlist_id,
            defaults={"channel": video_channel, **playlist_data},
        )

        load_topics(playlist, topics_data)
        load_offered_bys(playlist, offered_by_data, config=config.offered_by)

    videos = load_videos(videos_data, config=config.videos)

    # atomically remove existing videos in the playlist and add the current ones in bulk
    with transaction.atomic():
        for position, video in enumerate(videos):
            PlaylistVideo.objects.update_or_create(
                playlist=playlist, video=video, defaults={"position": position}
            )
        PlaylistVideo.objects.filter(playlist=playlist).exclude(
            video_id__in=[video.id for video in videos]
        ).delete()

    load_playlist_user_list(playlist, user_list_title)

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
    playlists_to_unpublish = Playlist.objects.filter(channel=video_channel).exclude(
        id__in=playlist_ids
    )

    for playlist in playlists_to_unpublish.filter(has_user_list=True):
        user_list = playlist.user_list
        if user_list:
            search_task_helpers.delete_user_list(user_list)
            user_list.delete()

    playlists_to_unpublish.update(published=False, has_user_list=False)

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

    with transaction.atomic():
        video_channel, _ = VideoChannel.objects.select_for_update().update_or_create(
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
        video.published = False
        video.save()
        search_task_helpers.delete_video(video)

    return video_channels


def load_content_file(course_run, content_file_data):
    """
    Sync a course run file/page to the database

    Args:
        course_run (LearningResourceRun): a LearningResourceRun for a Course
        content_file_data (dict): File metadata as JSON

    Returns:
        Int: the id of the object that was created or updated
    """
    try:
        content_file, _ = ContentFile.objects.update_or_create(
            run=course_run, key=content_file_data.get("key"), defaults=content_file_data
        )
        return content_file.id
    except:  # pylint: disable=bare-except
        log.exception(
            "ERROR syncing course file %s for run %d",
            content_file_data.get("uid", ""),
            course_run.id,
        )


def load_content_files(course_run, content_files_data):
    """
    Sync all content files for a course run to database and S3 if not present in DB

    Args:
        course_run (LearningResourceRun): a course run
        content_files_data (list or generator): Details about the course run's content files

    Returns:
        list of int: Ids of the ContentFile objects that were created/updated

    """
    if course_run.content_type and course_run.content_type.name == COURSE_TYPE:
        content_files_ids = [
            load_content_file(course_run, content_file)
            for content_file in content_files_data
        ]

        deleted_files = course_run.content_files.filter(published=True).exclude(
            pk__in=content_files_ids
        )

        deleted_files.update(published=False)

        if course_run.published:
            search_task_helpers.index_run_content_files(course_run.id)
        else:
            search_task_helpers.delete_run_content_files(course_run.id)

        return content_files_ids


def load_podcast_episode(episode_data, podcast, *, config=PodcastEpisodeLoaderConfig()):
    """
    Load a podcast_episode into the database
    Args:
        episode_data (dict): data for the episode
        podcast (Podcast): podcast that the episode belongs to
        config (PodcastLoaderConfig):
            configuration for this loader

    Returns:
        list of PodcastEpisode objects that were created/updated
    """
    episode_id = episode_data.pop("episode_id")
    topics_data = episode_data.pop("topics", [])
    offered_bys_data = episode_data.pop("offered_by", [])

    episode, created = PodcastEpisode.objects.update_or_create(
        episode_id=episode_id, podcast=podcast, defaults=episode_data
    )

    load_topics(episode, topics_data)
    load_offered_bys(episode, offered_bys_data, config=config.offered_by)

    if not created and not episode.published:
        search_task_helpers.delete_podcast_episode(episode)
    elif episode.published:
        search_task_helpers.upsert_podcast_episode(episode.id)

    return episode


def load_podcast(podcast_data, *, config=PodcastLoaderConfig()):
    """
    Load a single podcast

    Arg:
        podcast_data (dict):
            the normalized podcast data
        config (PodcastLoaderConfig):
            configuration for this loader
    Returns:
        Podcast:
            the updated or created podcast
    """
    podcast_id = podcast_data.pop("podcast_id")
    episodes_data = podcast_data.pop("episodes", [])
    topics_data = podcast_data.pop("topics", [])
    offered_by_data = podcast_data.pop("offered_by", [])

    podcast, created = Podcast.objects.update_or_create(
        podcast_id=podcast_id, defaults=podcast_data
    )

    load_topics(podcast, topics_data)
    load_offered_bys(podcast, offered_by_data, config=config.offered_by)

    episode_ids = []

    for episode_data in episodes_data:
        episode = load_podcast_episode(episode_data, podcast, config=config.episodes)
        episode_ids.append(episode.id)

    unpublished_episodes = PodcastEpisode.objects.filter(podcast=podcast).exclude(
        id__in=episode_ids
    )

    for episode in unpublished_episodes:
        search_task_helpers.delete_podcast_episode(episode)

    unpublished_episodes.update(published=False)

    if not created and not podcast.published:
        search_task_helpers.delete_podcast(podcast)
    elif podcast.published:
        search_task_helpers.upsert_podcast(podcast.id)

    return podcast


def load_podcasts(podcasts_data):
    """
    Load a list of podcasts

    Args:
        podcasts_data (iter of dict): iterable of podcast data

    Returns:
        list of Podcasts:
            list of the loaded podcasts
    """
    podcasts = []

    for podcast_data in podcasts_data:
        podcast_id = podcast_data["podcast_id"]
        try:
            podcast = load_podcast(podcast_data)
        except ExtractException:
            log.exception("Error with extracted podcast: podcast_id=%s", podcast_id)
        else:
            podcasts.append(podcast)

    # unpublish the podcasts we're no longer tracking
    ids = [podcast.id for podcast in podcasts]
    Podcast.objects.exclude(id__in=ids).update(published=False)
    PodcastEpisode.objects.exclude(podcast_id__in=ids).update(published=False)

    return podcasts
