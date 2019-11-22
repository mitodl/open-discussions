"""Tests for Video ETL functions"""
# pylint: disable=redefined-outer-name
from collections import defaultdict
from unittest.mock import Mock, MagicMock
from glob import glob
from os.path import basename
import json
import pytest
import googleapiclient.errors

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.exceptions import (
    ExtractVideoException,
    ExtractPlaylistException,
    ExtractPlaylistItemException,
)
from course_catalog.etl import youtube


@pytest.fixture
def youtube_api_responses():
    """Load the api responses"""
    mock_responses = defaultdict(list)

    # these need to be sorted() so that *.N.json files get appended in the proper order
    for pathname in sorted(glob("test_json/youtube/*.json")):
        mod_name, func_name, _, _ = basename(pathname).split(".")

        with open(pathname, "r") as f:
            mock_responses[(mod_name, func_name)].append(json.load(f))

    for (mod_name, func_name), side_effects in mock_responses.items():
        if func_name == "list_next":
            # list_next() operations return None when there's no additional pages to fetch
            side_effects.append(None)

    return mock_responses


@pytest.fixture(autouse=True)
def video_settings(settings):
    """Mock for django settings"""
    settings.YOUTUBE_DEVELOPER_KEY = "key"
    return settings


@pytest.fixture(autouse=True)
def mock_youtube_client(mocker, youtube_api_responses):
    """Mocks out the youtube client with static json data"""
    # each side effect should default to an empty list
    config = defaultdict(list)
    # build up a config based on filenames of the loaded responses, as an example
    # the original filename "videos.list.0.json" will create this key:
    #   "videos.return_value.list.return_value.execute.side_effect"
    config.update(
        {
            f"{'.return_value.'.join(key)}.return_value.execute.side_effect": value
            for key, value in youtube_api_responses.items()
        }
    )
    # append None to each of the list_next funcs so pagination terminates
    for mod in ["channels", "playlistItems", "playlists", "video"]:
        config[f"{mod}.return_value.list_next.return_value.execute.side_effect"].append(
            None
        )

    mock_client = mocker.patch("course_catalog.etl.youtube.get_youtube_client")
    mock_client.return_value.configure_mock(**config)
    return mock_client


def mock_channel_file(offered_by, channel_id, playlist_id):
    """Mock video channel github file"""

    content = f"""---
offered_by: {offered_by}
channel_id: {channel_id}
playlists:
  - id: {playlist_id}

"""

    return Mock(decoded_content=content)


@pytest.fixture
def mocked_github_channel_response(mocker):
    """Mock response from github api requst to open-video-data"""
    channel_list = [
        mock_channel_file(
            OfferedBy.mitx.value, "UCTBMWu8yshnAmpzR3MoJFtw", "PL221E2BBF13BECF6C"
        ),
        mock_channel_file(
            OfferedBy.ocw.value,
            "UCEBb1b_L6zDS3xTUrIALZOw",
            "PLTz-v-F773kXwTSKsX_E9t8ZnP_3LYaGy",
        ),
    ]
    mock_github_client = mocker.patch("github.Github")
    mock_github_client.return_value.get_repo.return_value.get_contents.return_value = (
        channel_list
    )


@pytest.fixture
def extracted_and_transformed_values(youtube_api_responses):
    """Mock data for the API responses and how they are transformed"""
    channels_list = youtube_api_responses[("channels", "list")]
    playlists_list = youtube_api_responses[("playlists", "list")]
    playlist_items_list = youtube_api_responses[("playlistItems", "list")]
    playlist_items_list_next = youtube_api_responses[("playlistItems", "list_next")]
    videos_list = youtube_api_responses[("videos", "list")]

    ocw_items = playlist_items_list[0]["items"] + playlist_items_list_next[0]["items"]
    ocw_items_order = [item["contentDetails"]["videoId"] for item in ocw_items]

    mitx_items = playlist_items_list[1]["items"]
    mitx_items_order = [item["contentDetails"]["videoId"] for item in mitx_items]

    # sort the videos by the order they appeared in playlistItems responses
    ocw_videos = sorted(
        videos_list[0]["items"] + videos_list[1]["items"],
        key=lambda item: ocw_items_order.index(item["id"]),
    )
    mitx_videos = sorted(
        videos_list[2]["items"], key=lambda item: mitx_items_order.index(item["id"])
    )

    extracted = [
        (
            OfferedBy.ocw.value,
            channels_list[0]["items"][0],
            [(playlists_list[0]["items"][0], ocw_videos, True)],
        ),
        (
            OfferedBy.mitx.value,
            channels_list[0]["items"][1],
            [(playlists_list[1]["items"][0], mitx_videos, True)],
        ),
    ]

    transformed = [
        {
            "platform": PlatformType.youtube.value,
            "channel_id": channel["id"],
            "title": channel["snippet"]["title"],
            "offered_by": [{"name": offered_by}] if offered_by else [],
            "playlists": [
                {
                    "platform": PlatformType.youtube.value,
                    "playlist_id": playlist["id"],
                    "offered_by": [{"name": offered_by}] if offered_by else [],
                    "title": playlist["snippet"]["title"],
                    "has_user_list": has_user_list,
                    "videos": [
                        {
                            "video_id": video["id"],
                            "platform": PlatformType.youtube.value,
                            "full_description": video["snippet"]["description"],
                            "short_description": video["snippet"]["description"],
                            "duration": video["contentDetails"]["duration"],
                            "image_src": video["snippet"]["thumbnails"]["high"]["url"],
                            "last_modified": video["snippet"]["publishedAt"],
                            "published": True,
                            "url": f"https://www.youtube.com/watch?v={video['id']}",
                            "offered_by": [{"name": offered_by}] if offered_by else [],
                            "title": video["snippet"]["localized"]["title"],
                            "raw_data": video,
                            "runs": [
                                {
                                    "run_id": video["id"],
                                    "platform": PlatformType.youtube.value,
                                    "prices": [{"price": 0}],
                                }
                            ],
                        }
                        for video in videos
                    ],
                }
                for playlist, videos, has_user_list in playlists
            ],
        }
        for offered_by, channel, playlists in extracted
    ]

    return extracted, transformed


def _resolve_extracted_channels(channels):
    """Resolve the nested generator data"""
    return list(
        [
            (
                offered_by,
                channel_data,
                list(map(_resolve_extracted_playlist, playlists)),
            )
            for offered_by, channel_data, playlists in channels
        ]
    )


def _resolve_extracted_playlist(playlist):
    """Resolve a playlist and its nested generators"""
    playlist_data, videos, has_user_list = playlist
    return (playlist_data, list(videos), has_user_list)


@pytest.fixture
def mock_raw_caption_data():
    """Mock data for raw youtube video caption"""
    return '<?xml version="1.0" encoding="utf-8" ?><transcript><text start="0" dur="0.5"></text><text start="0.5" dur="3.36">PROFESSOR: So, now we come to\nthe place where arithmetic,</text><text start="3.86" dur="2.67">modulo n or\nremainder arithmetic,</text><text start="6.53" dur="3.05">starts to be a little bit\ndifferent and that involves</text><text start="9.58" dur="2.729">taking inverses and cancelling.</text></transcript>'


@pytest.fixture
def mock_parsed_transcript_data():
    """Mock data for parsed video caption"""
    return "PROFESSOR: So, now we come to the place where arithmetic,\nmodulo n or remainder arithmetic,\nstarts to be a little bit different and that involves\ntaking inverses and cancelling."


def mock_pytube_caption_object(code, name, xml_caption):
    """Mock pytube caption object"""
    mocked_caption = MagicMock()
    mocked_caption.name = name
    mocked_caption.code = code
    mocked_caption.xml_captions = xml_caption

    return mocked_caption


def test_get_captions_for_video(mocker):
    """Test fetching caption data for a video when non auto-generated english caption is available"""
    captions_list = [
        mock_pytube_caption_object("en", "Caption", "English: Not Auto-generated"),
        mock_pytube_caption_object("en", "auto-generated", "English: Auto-generated"),
        mock_pytube_caption_object("es", "Spanish", "Spanish"),
    ]

    mock_pytube_client = mocker.patch("pytube.YouTube")
    mock_pytube_client.return_value.captions.all.return_value = captions_list

    video = Mock()
    assert youtube.get_captions_for_video(video) == "English: Not Auto-generated"


def test_get_captions_for_video_autogenerated_only(mocker):
    """Test fetching caption data for a video when only auto-generated english caption is available"""
    captions_list = [
        mock_pytube_caption_object("en", "auto-generated", "English: Auto-generated"),
        mock_pytube_caption_object("es", "Spanish", "Spanish"),
    ]

    mock_pytube_client = mocker.patch("pytube.YouTube")
    mock_pytube_client.return_value.captions.all.return_value = captions_list

    video = Mock()
    assert youtube.get_captions_for_video(video) == "English: Auto-generated"


def test_get_captions_for_video_no_english_caption(mocker):
    """Test fetching caption data for a video with no english caption available"""
    captions_list = [mock_pytube_caption_object("es", "Spanish", "Spanish")]

    mock_pytube_client = mocker.patch("pytube.YouTube")
    mock_pytube_client.return_value.captions.all.return_value = captions_list

    video = Mock()
    assert youtube.get_captions_for_video(video) is None


def test_parse_video_captions(mock_raw_caption_data, mock_parsed_transcript_data):
    """Test for youtube.parse_video_captions"""
    assert (
        youtube.parse_video_captions(mock_raw_caption_data)
        == mock_parsed_transcript_data
    )


@pytest.mark.usefixtures("mock_youtube_client", "mocked_github_channel_response")
def test_extract(extracted_and_transformed_values):
    """Test that extract returns expected responses"""
    extracted, _ = extracted_and_transformed_values

    assert _resolve_extracted_channels(youtube.extract()) == extracted


@pytest.mark.usefixtures("mocked_github_channel_response")
@pytest.mark.parametrize(
    "operation_key, exception_cls",
    [
        [("playlists", "list"), ExtractPlaylistException],
        [("playlistItems", "list"), ExtractPlaylistItemException],
        [("videos", "list"), ExtractVideoException],
    ],
)
def test_extract_with_exception(
    mock_youtube_client, youtube_api_responses, operation_key, exception_cls
):  # pylint: disable=too-many-locals
    """Test youtube video ETL"""
    # error on the first call, this will consistently be the first channel
    side_effect = youtube_api_responses[operation_key][:]
    side_effect[0] = googleapiclient.errors.HttpError(MagicMock(), bytes())

    channels_list = youtube_api_responses[("channels", "list")]
    playlists_list = youtube_api_responses[("playlists", "list")]
    playlist_items_list = youtube_api_responses[("playlistItems", "list")]
    videos_list = youtube_api_responses[("videos", "list")]

    modified_config = {
        f"{'.return_value.'.join(operation_key)}.return_value.execute.side_effect": side_effect
    }

    if operation_key[0] in ["playlists", "playlistItems"]:
        # if the error was on playlists.list or playlistItems.list
        # then videos.list needs to return the second channel's data on the first call
        modified_config[
            "videos.return_value.list.return_value.execute.side_effect"
        ] = videos_list[2:]
    if operation_key[0] == "playlists":
        # if the error was on playlists.list
        # then playlistItems.list needs to return the second channel's data on the first call
        modified_config[
            "playlistItems.return_value.list.return_value.execute.side_effect"
        ] = playlist_items_list[1:]
    if operation_key[0] == "videos":
        # if the error is on the video, the 2nd call to videos needs to be what was originally the 3rd
        # so we delete the second side_effect as the first is an HttpError now
        del side_effect[1]

    mock_youtube_client.return_value.configure_mock(**modified_config)

    results = list(youtube.extract())

    offered_by, channel_data, playlists = results[0]

    assert offered_by == OfferedBy.ocw.value
    assert channel_data == channels_list[0]["items"][0]

    with pytest.raises(exception_cls):
        # exercise the generator tree to trigger the exception
        for _, videos, _ in playlists:
            list(videos)

    offered_by, channel_data, playlists = results[1]
    playlists = list(playlists)
    assert len(playlists) == 1

    playlist_data, videos, _ = playlists[0]

    assert offered_by == OfferedBy.mitx.value
    assert channel_data == channels_list[0]["items"][1]
    assert playlist_data == playlists_list[1]["items"][0]
    assert list(videos) == videos_list[2]["items"]


def test_extract_with_unset_keys(settings):
    """Test youtube video ETL extract with no keys set"""
    settings.YOUTUBE_DEVELOPER_KEY = None

    assert _resolve_extracted_channels(youtube.extract()) == []


@pytest.mark.usefixtures("video_settings", "mocked_github_channel_response")
@pytest.mark.parametrize("yaml_parser_response", [None, {}, {"channels": []}])
def test_extract_with_no_channels(mocker, yaml_parser_response):
    """Test youtube video ETL extract with no channels in data"""
    mocker.patch("yaml.safe_load", return_value=yaml_parser_response)

    assert _resolve_extracted_channels(youtube.extract()) == []


def test_transform_video(extracted_and_transformed_values):
    """test youtube transform for a video"""
    extracted, transformed = extracted_and_transformed_values
    result = youtube.transform_video(extracted[0][2][0][1][0], OfferedBy.ocw.value)
    assert result == transformed[0]["playlists"][0]["videos"][0]


@pytest.mark.parametrize("has_user_list", [True, False])
def test_transform_playlist(extracted_and_transformed_values, has_user_list):
    """test youtube transform for a playlist"""
    extracted, transformed = extracted_and_transformed_values
    result = youtube.transform_playlist(
        extracted[0][2][0][0], extracted[0][2][0][1], OfferedBy.ocw.value, has_user_list
    )
    assert {**result, "videos": list(result["videos"])} == {
        **transformed[0]["playlists"][0],
        "has_user_list": has_user_list,
    }


def test_transform(extracted_and_transformed_values):
    """test youtube transform"""
    extracted, transformed = extracted_and_transformed_values
    channels = youtube.transform(extracted)
    assert (
        list(
            [
                {
                    **channel,
                    "playlists": list(
                        [
                            {**playlist, "videos": list(playlist["videos"])}
                            for playlist in channel["playlists"]
                        ]
                    ),
                }
                for channel in channels
            ]
        )
        == transformed
    )


@pytest.mark.parametrize(
    "config, expected",
    [
        (None, ["Channel config data is empty"]),
        ({}, ["Channel config data is empty"]),
        ("a string", ["Channel data should be a dict"]),
        ({"channel_id": "abc", "offered_by": "org", "playlists": [{"id": "def"}]}, []),
        ({"channel_id": "abc", "playlists": [{"id": "def"}]}, []),
        (
            {"offered_by": "org"},
            [
                "Required key 'playlists' is not present",
                "Required key 'channel_id' is not present",
            ],
        ),
        (
            {"channel_id": "abc", "playlists": [{}]},
            ["Required key 'id' not present in playlists[0]"],
        ),
    ],
)
def test_validate_channel_config(config, expected):
    """Test that validate_channel_config returns expected errors"""
    assert youtube.validate_channel_config(config) == expected
