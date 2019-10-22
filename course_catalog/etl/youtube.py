"""video catalog ETL"""
import logging
from django.conf import settings
from googleapiclient.discovery import build
import googleapiclient.errors
import yaml
import requests


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


def get_videos_for_channel(youtube_client, channel_id, offered_by):
    """
    Function which returns a generator that loops through a youtube channel and
    returns video data

    Args:
        youtube_client: Youtube api client
        channel_id: Youtube's id for a channel
        offered_by: Our offered by tag for the youtube channel

    Returns:
        A generator that yields tuples with offered_by and video data

    """

    page_token = ""

    while True:

        try:
            search_request = youtube_client.search().list(
                channelId=channel_id,
                maxResults=50,
                pageToken=page_token,
                part="snippet",
                type="video",
            )
            search_response = search_request.execute()

            video_ids = map(
                lambda video: video["id"]["videoId"], search_response["items"]
            )
            video_ids_paramenter = ", ".join(video_ids)

            full_request = youtube_client.videos().list(
                part="snippet,contentDetails", id=video_ids_paramenter
            )
            full_response = full_request.execute()

            for video_data in full_response["items"]:
                yield (offered_by, video_data)

            if "nextPageToken" in search_response:
                page_token = search_response["nextPageToken"]
            else:
                break

        except googleapiclient.errors.HttpError:
            log.exception("Unable to fetch videos for channel id=%s", channel_id)
            break


def extract():
    """
    Function which returns video data for all videos in our watched channels


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
            yield from get_videos_for_channel(
                youtube_client, channel["channel_id"], channel["offered_by"]
            )
