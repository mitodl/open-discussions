"""video catalog ETL"""
import logging
from django.conf import settings
from googleapiclient.discovery import build
import googleapiclient.errors
import yaml
import requests
from course_catalog.etl.utils import log_exceptions
from course_catalog.constants import PlatformType


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


def get_videos_for_playlist(youtube_client, playlist_id, offered_by):
    """
    Function which returns a generator that loops through a youtube playlist and
    returns video data

    Args:
        youtube_client (object): Youtube api client
        playlist_id (str): Youtube's id for a playlist
        offered_by (str): Our offered by tag for the youtube playlist

    Returns:
        A generator that yields tuples with offered_by and video data

    """

    page_token = ""

    while True:

        try:
            playlist_items_request = youtube_client.playlistItems().list(
                part="contentDetails",
                maxResults=50,
                playlistId=playlist_id,
                pageToken=page_token,
            )

            playlist_items_response = playlist_items_request.execute()

            video_ids = map(
                lambda video: video["contentDetails"]["videoId"],
                playlist_items_response["items"],
            )
            video_ids_paramenter = ", ".join(video_ids)

            full_request = youtube_client.videos().list(
                part="snippet,contentDetails", id=video_ids_paramenter
            )
            full_response = full_request.execute()

            for video_data in full_response["items"]:
                yield (offered_by, video_data)

            if "nextPageToken" in playlist_items_response:
                page_token = playlist_items_response["nextPageToken"]
            else:
                break

        except googleapiclient.errors.HttpError:
            log.exception("Unable to fetch videos for playlist id=%s", playlist_id)
            break


def extract():
    """
    Function which returns video data for all videos in our watched playlists


    Returns:
        A generator that yields tuples with offered_by and video data

    """
    if not (settings.YOUTUBE_CONFIG_FILE_LOCATION and settings.YOUTUBE_DEVELOPER_KEY):
        return

    youtube_client = get_youtube_client()
    response = requests.get(settings.YOUTUBE_CONFIG_FILE_LOCATION)
    response.raise_for_status()

    channels_yml = yaml.safe_load(response.content)

    if channels_yml and ("channels" in channels_yml):
        for channel in channels_yml["channels"]:
            if "playlists" in channel:
                for playlist_id in channel["playlists"]:
                    yield from get_videos_for_playlist(
                        youtube_client, playlist_id, channel["offered_by"]
                    )


def transform_single_video(offered_by, raw_video_data):
    """
    Transforms raw video data into normalized data structure for single video

    Args:
        offered_by (string)
        raw_video_data (dict)

    Returns:
        dict: normalized video data
    """
    return {
        "video_id": raw_video_data["id"],
        "platform": PlatformType.youtube.value,
        "full_description": raw_video_data["snippet"]["description"],
        "image_src": raw_video_data["snippet"]["thumbnails"]["high"]["url"],
        "last_modified": raw_video_data["snippet"]["publishedAt"],
        "published": True,
        "url": "https://www.youtube.com/watch?v=%s" % raw_video_data["id"],
        "offered_by": [{"name": offered_by}],
        "title": raw_video_data["snippet"]["localized"]["title"],
        "raw_data": raw_video_data,
    }


@log_exceptions("Error transforming youtube data", exc_return_value=[])
def transform(raw_videos_data):
    """
    Transforms raw video data into normalized data structure

    Args:
        raw_videos_data (iterable of tuples) tuple has the structure (offered_by, data)

    Returns:
        generator that yields normalized video data
    """
    for offered_by, raw_video_data in raw_videos_data:
        yield transform_single_video(offered_by, raw_video_data)
