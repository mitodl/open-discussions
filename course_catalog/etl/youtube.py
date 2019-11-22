"""video catalog ETL"""
import logging
from html import unescape
from xml.etree import ElementTree
from django.conf import settings

from googleapiclient.discovery import build
import googleapiclient.errors
import yaml
import pytube
import github

from course_catalog.constants import PlatformType
from course_catalog.etl.exceptions import (
    ExtractVideoException,
    ExtractPlaylistException,
    ExtractPlaylistItemException,
)
from course_catalog.etl.utils import log_exceptions


CONFIG_FILE_REPO = "mitodl/open-video-data"
CONFIG_FILE_FOLDER = "youtube"
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

log = logging.getLogger()


def get_youtube_client():
    """
    Function to generate a Google api client

    Returns:
        Google Api client object
    """

    developer_key = settings.YOUTUBE_DEVELOPER_KEY
    return build(
        YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, developerKey=developer_key
    )


def extract_videos(youtube_client, video_ids):
    """
    Function which returns a generator that loops through a list of video ids and returns video data

    Args:
        youtube_client (object): Youtube api client
        video_ids (list of str): video ids

    Returns:
        A generator that yields video data
    """
    video_ids = list(video_ids)
    try:
        request = youtube_client.videos().list(
            part="snippet,contentDetails", id=",".join(video_ids)
        )
        response = request.execute()

        # yield items in the order in which they were passed in so the playlist order is correct
        yield from sorted(
            response["items"], key=lambda item: video_ids.index(item["id"])
        )
    except StopIteration:
        return
    except googleapiclient.errors.HttpError as exc:
        raise ExtractVideoException(f"Error fetching video_ids={video_ids}") from exc


def extract_playlist_items(youtube_client, playlist_id):
    """
    Extract a playlist's items

    Args:
        youtube_client (object): Youtube api client
        playlist_id (str): Youtube's id for a playlist

    Returns:
        A generator that yields video data
    """

    try:
        request = youtube_client.playlistItems().list(
            part="contentDetails", maxResults=50, playlistId=playlist_id
        )

        while request is not None:
            response = request.execute()

            if response is None:
                break

            video_ids = map(
                lambda item: item["contentDetails"]["videoId"], response["items"]
            )

            yield from extract_videos(youtube_client, video_ids)

            request = youtube_client.playlistItems().list_next(request, response)

    except StopIteration:
        return
    except googleapiclient.errors.HttpError as exc:
        raise ExtractPlaylistItemException(
            f"Error fetching playlist items: playlist_id={playlist_id}"
        ) from exc


def extract_playlists(youtube_client, playlist_configs):
    """
    Extract a list of playlists

    Args:
        youtube_client (object): Youtube api client
        playlist_configs (list of dict): list of playlist configurations

    Returns:
        A generator that yields playlist data
    """

    playlist_configs_by_id = {
        playlist_config["id"]: playlist_config for playlist_config in playlist_configs
    }
    playlist_ids = playlist_configs_by_id.keys()

    try:
        request = youtube_client.playlists().list(
            part="snippet", id=",".join(playlist_ids), maxResults=50
        )

        while request is not None:
            response = request.execute()

            if response is None:
                break

            for playlist_data in response["items"]:
                playlist_id = playlist_data["id"]
                playlist_config = playlist_configs_by_id[playlist_id]

                yield (
                    playlist_data,
                    extract_playlist_items(youtube_client, playlist_id),
                    playlist_config.get("create_user_list", True),
                )

            request = youtube_client.playlists().list_next(request, response)
    except StopIteration:
        return
    except googleapiclient.errors.HttpError as exc:
        raise ExtractPlaylistException(
            f"Error fetching channel playlists: playlist_ids={playlist_ids}"
        ) from exc


def extract_channels(youtube_client, channels_config):
    """
    Extract a list of channels

    Args:
        youtube_client (object): Youtube api client
        channels_config (list of dict): list of channel configurations

    Returns:
        A generator that yields channel data
    """
    channel_configs_by_ids = {item["channel_id"]: item for item in channels_config}
    channel_ids = set(channel_configs_by_ids.keys())

    if not channel_ids:
        return

    try:
        request = youtube_client.channels().list(
            part="snippet", id=",".join(channel_ids), maxResults=50
        )

        while request is not None:
            response = request.execute()

            if response is None:
                break

            for channel_data in response["items"]:
                channel_id = channel_data["id"]
                channel_config = channel_configs_by_ids[channel_id]
                offered_by = channel_config.get("offered_by", None)
                playlist_configs = channel_config.get("playlists", [])

                # if we hit any error on a playlist, we simply abort
                playlists = extract_playlists(youtube_client, playlist_configs)
                yield (offered_by, channel_data, playlists)

            request = youtube_client.channels().list_next(request, response)
    except StopIteration:
        return
    except googleapiclient.errors.HttpError:
        log.exception("Error fetching channels: channel_ids=%s", channel_ids)


def get_captions_for_video(video):
    """
    Function which fetches and returns xml captions for a video object

    Args:
        video (course_catalog.models.Video)

    Returns:
        str: transcript in xml format

    """
    pytube_client = pytube.YouTube(video.url)
    all_captions = pytube_client.captions.all()

    english_captions = [caption for caption in all_captions if caption.code == "en"]
    # sort auto-generated captions to the bottom of the list
    sorted_captions = sorted(
        english_captions, key=lambda caption: "auto-generated" in caption.name
    )

    return sorted_captions[0].xml_captions if sorted_captions else None


def parse_video_captions(xml_captions):
    """
    Function which parses xml captions and returns a string with just the transcript

    Args:
        xml_captions (str): Caption as xml with text and timestamps

    Returns:
        str: transcript with timestamps removed

    """

    if not xml_captions:
        return ""

    captions_list = []
    root = ElementTree.fromstring(xml_captions)

    for child in root.iter():
        text = child.text or ""
        text = unescape(text.replace("\n", " ").replace("  ", " "))

        if text:
            captions_list.append(text)

    return "\n".join(captions_list)


def github_youtube_config_files():
    """
    Function that returns a list of pyGithub files with youtube config channel data

    Returns:
        A list of pyGithub contentFile objects
    """
    github_client = github.Github()
    repo = github_client.get_repo(CONFIG_FILE_REPO)

    return repo.get_contents(CONFIG_FILE_FOLDER, ref=settings.OPEN_VIDEO_DATA_BRANCH)


def validate_channel_config(channel_config):
    """
    Validates a channel config

    Args:
        channel_config (dict):
            the channel config object

    Returns:
        list of str:
            list of errors or an empty list if no errors
    """
    errors = []

    if not channel_config:
        errors.append("Channel config data is empty")
        return errors

    if not isinstance(channel_config, dict):
        errors.append("Channel data should be a dict")
        return errors

    for required_key in ["playlists", "channel_id"]:
        if required_key not in channel_config:
            errors.append(f"Required key '{required_key}' is not present")

    for idx, playlist_config in enumerate(channel_config.get("playlists", [])):
        if "id" not in playlist_config:
            errors.append(f"Required key 'id' not present in playlists[{idx}]")

    return errors


def get_youtube_channel_configs(*, channel_ids=None):
    """
    Fetch youtube channel configs from github

    Args:
        channel_ids (list of str):
            list of channel ids to filter the configs

    Returns:
        list of dict:
            a list of configuration objects
    """
    channel_configs = []

    for file in github_youtube_config_files():
        try:
            channel_config = yaml.safe_load(file.decoded_content)

            errors = validate_channel_config(channel_config)

            if errors:
                log.error(
                    "Invalid youtube channel config for path=%s errors=%s",
                    file.path,
                    errors,
                )
            elif not channel_ids or channel_config["channel_id"] in channel_ids:
                channel_configs.append(channel_config)
        except yaml.scanner.ScannerError:
            log.exception("Error parsing youtube channel config for path=%s", file.path)
            continue

    return channel_configs


@log_exceptions("Error extracting youtube data", exc_return_value=[])
def extract(*, channel_ids=None):
    """
    Function which returns video data for all videos in our watched playlists

    Args:
        channel_ids (list of str or None): if a list the extraction is limited to those channels

    Returns:
        A generator that yields tuples with offered_by and video data
    """
    if not settings.YOUTUBE_DEVELOPER_KEY:
        return

    youtube_client = get_youtube_client()
    channels_config = get_youtube_channel_configs(channel_ids=channel_ids)

    yield from extract_channels(youtube_client, channels_config)


def transform_video(video_data, offered_by):
    """
    Transforms raw video data into normalized data structure for single video

    Args:
        video_data (dict): the raw video data from the youtube api
        offered_by (str): the offered_by value for this playlist

    Returns:
        dict: normalized video data
    """
    return {
        "video_id": video_data["id"],
        "platform": PlatformType.youtube.value,
        "duration": video_data["contentDetails"]["duration"],
        "short_description": video_data["snippet"]["description"],
        "full_description": video_data["snippet"]["description"],
        "image_src": video_data["snippet"]["thumbnails"]["high"]["url"],
        "last_modified": video_data["snippet"]["publishedAt"],
        "published": True,
        "url": f"https://www.youtube.com/watch?v={video_data['id']}",
        "offered_by": [{"name": offered_by}] if offered_by else [],
        "title": video_data["snippet"]["localized"]["title"],
        "raw_data": video_data,
        "runs": [
            {
                "run_id": video_data["id"],
                "platform": PlatformType.youtube.value,
                "prices": [{"price": 0}],
            }
        ],
    }


def transform_playlist(playlist_data, videos, offered_by, has_user_list):
    """
    Transform a playlist into our normalized data

    Args:
        playlist (tuple): the extracted playlist data
        offered_by (str): the offered_by value for this playlist

    Returns:
        dict:
            normalized playlist data
    """
    return {
        "platform": PlatformType.youtube.value,
        "playlist_id": playlist_data["id"],
        "title": playlist_data["snippet"]["title"],
        "offered_by": [{"name": offered_by}] if offered_by else [],
        "has_user_list": has_user_list,
        # intentional generator expression
        "videos": (
            transform_video(extracted_video, offered_by) for extracted_video in videos
        ),
    }


@log_exceptions("Error transforming youtube data", exc_return_value=[])
def transform(extracted_channels):
    """
    Transforms raw video data into normalized data structure

    Args:
        extracted_channels (iterable of tuple): the youtube channels that were fetched

    Returns:
        generator that yields normalized video data
    """
    # NOTE: this generator has nested generators (channels -> playlists -> videos)
    # this is by design so that when the loaders run an exception raised in an
    # extraction function can signal to the loader code that a partial import occurred
    # if you change this it may trigger undefined behavior in the loaders
    for offered_by, channel_data, playlists in extracted_channels:
        yield {
            "platform": PlatformType.youtube.value,
            "channel_id": channel_data["id"],
            "title": channel_data["snippet"]["title"],
            "offered_by": [{"name": offered_by}] if offered_by else [],
            # intentional generator expression
            "playlists": (
                transform_playlist(playlist, videos, offered_by, has_user_list)
                for playlist, videos, has_user_list in playlists
            ),
        }
