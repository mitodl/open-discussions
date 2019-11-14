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
from course_catalog.etl.utils import log_exceptions
from course_catalog.constants import PlatformType


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
            video_ids_parameter = ", ".join(video_ids)

            full_request = youtube_client.videos().list(
                part="snippet,contentDetails", id=video_ids_parameter
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

    for file in github_youtube_config_files():
        try:
            channel_data = yaml.safe_load(file.decoded_content)
        except yaml.scanner.ScannerError:
            continue

        if (
            channel_data
            and isinstance(channel_data, dict)
            and ("playlists" in channel_data)
            and ("offered_by" in channel_data)
            and ("channel_id" in channel_data)
        ):
            if channel_ids and not channel_data["channel_id"] in channel_ids:
                continue

            for playlist in channel_data["playlists"]:
                if isinstance(playlist, dict) and "id" in playlist:
                    yield from get_videos_for_playlist(
                        youtube_client, playlist["id"], channel_data["offered_by"]
                    )


def transform_single_video(offered_by, raw_video_data):
    """
    Transforms raw video data into normalized data structure for single video

    Args:
        offered_by (string): the OfferedBy value for this video
        raw_video_data (dict): the raw data from the Youtube API

    Returns:
        dict: normalized video data
    """
    return {
        "video_id": raw_video_data["id"],
        "platform": PlatformType.youtube.value,
        "duration": raw_video_data["contentDetails"]["duration"],
        "short_description": raw_video_data["snippet"]["description"],
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
        raw_videos_data (iterable of tuples): tuple has the structure (offered_by, data)

    Returns:
        generator that yields normalized video data
    """
    for offered_by, raw_video_data in raw_videos_data:
        yield transform_single_video(offered_by, raw_video_data)
