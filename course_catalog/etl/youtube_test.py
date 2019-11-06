"""Tests for Video ETL functions"""
# pylint: disable=redefined-outer-name
from unittest.mock import MagicMock
import pytest
import googleapiclient.errors
from course_catalog.etl import youtube


def mock_list_items_data(next_token=None):
    """Mock video playlist list data"""
    data = {
        "kind": "youtube#playlistItemListResponse",
        "etag": '"j6xRRd8dTPVVptg711_CSPADRfg/xusLJ2FRC1XScoMyK2-1FU9fnzA"',
        "pageInfo": {"totalResults": 53, "resultsPerPage": 1},
        "items": [
            {
                "kind": "youtube#playlistItem",
                "etag": '"j6xRRd8dTPVVptg711_CSPADRfg/ZMYt2whVvQV7UzaXyfd2eP40S9Q"',
                "id": "VVVUQk1XdTh5c2huQW1welIzTW9KRnR3LmZ0TFdOWUJUZjJz",
                "contentDetails": {
                    "videoId": "QU0fLnucE6A",
                    "videoPublishedAt": "2019-10-25T04:00:09.000Z",
                },
            }
        ],
    }

    if next_token is not None:
        data["nextPageToken"] = next_token

    return data


@pytest.fixture
def mock_video_data():
    """Mock data for a single video"""
    return {
        "contentDetails": {
            "caption": "true",
            "definition": "hd",
            "dimension": "2d",
            "duration": "PT3M14S",
            "licensedContent": False,
            "projection": "rectangular",
        },
        "etag": '"j6xRRd8dTPVVptg711_CSPADRfg/Bh4Z5YJX4kTKyCsVio3xqVS9nx0"',
        "id": "QU0fLnucE6A",
        "kind": "youtube#video",
        "snippet": {
            "categoryId": "27",
            "channelId": "UCTBMWu8yshnAmpzR3MoJFtw",
            "channelTitle": "MITx Videos",
            "defaultAudioLanguage": "en",
            "description": "Professor Krishna Rajagopal explains Faraday Cages and why it's not such a bad thing if you're in a lightning storm as long as you're inside a car. Learn more and enroll now at https://www.edx.org/course/electricity-and-magnetism-electrostatics?utm_campaign=mitx&utm_medium=partner-marketing&utm_source=social&utm_content=youtube-8.01.1x-faraday",
            "liveBroadcastContent": "none",
            "localized": {
                "description": "Professor Krishna Rajagopal explains Faraday Cages and why it's not such a bad thing if you're in a lightning storm as long as you're inside a car. Learn more and enroll now at https://www.edx.org/course/electricity-and-magnetism-electrostatics?utm_campaign=mitx&utm_medium=partner-marketing&utm_source=social&utm_content=youtube-8.01.1x-faraday",
                "title": "Faraday Cage",
            },
            "publishedAt": "2018-10-09T18:18:09.000Z",
            "thumbnails": {"high": {"url": "thumbnailurl.com"}},
        },
    }


def mock_normalized_video_data(offered_by, video_data):
    """Mock normalized data for a single video"""

    return {
        "video_id": video_data["id"],
        "platform": "youtube",
        "full_description": video_data["snippet"]["description"],
        "image_src": video_data["snippet"]["thumbnails"]["high"]["url"],
        "last_modified": video_data["snippet"]["publishedAt"],
        "published": True,
        "url": "https://www.youtube.com/watch?v=%s" % video_data["id"],
        "offered_by": [{"name": offered_by}],
        "title": video_data["snippet"]["localized"]["title"],
        "raw_data": video_data,
    }


@pytest.fixture(autouse=True)
def video_settings(settings):
    """Mock for django settings"""
    settings.YOUTUBE_CONFIG_FILE_LOCATION = "https://youtube_empty.yaml"
    settings.YOUTUBE_DEVELOPER_KEY = "key"
    return settings


@pytest.fixture
def mock_video_batch_data(mock_video_data):
    """Mock video request data for a batch"""
    data = {
        "kind": "youtube#videoListResponse",
        "etag": '"j6xRRd8dTPVVptg711_CSPADRfg/j0RF7LBD1f8ViAQN-D94fJ40WZ8"',
        "pageInfo": {"totalResults": 1, "resultsPerPage": 1},
        "items": [mock_video_data],
    }

    return data


@pytest.fixture
def mock_channel_data():
    """Mock video channel yml"""
    return """
---
channels:
  - offered_by: MIT
    channel_id: channel1
    playlists:
      - playlist1
  - offered_by: OCW
    channel_id: channel2
    playlists:
      - playlist2
"""


@pytest.fixture
def mocked_channel_response(mocked_responses, mock_channel_data, video_settings):
    """Mock the channel catalog response"""
    mocked_responses.add(
        mocked_responses.GET,
        video_settings.YOUTUBE_CONFIG_FILE_LOCATION,
        body=mock_channel_data,
    )
    yield mocked_responses


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

    video = mocker.Mock()
    assert youtube.get_captions_for_video(video) == "English: Not Auto-generated"


def test_get_captions_for_video_autogenerated_only(mocker):
    """Test fetching caption data for a video when only auto-generated english caption is available"""
    captions_list = [
        mock_pytube_caption_object("en", "auto-generated", "English: Auto-generated"),
        mock_pytube_caption_object("es", "Spanish", "Spanish"),
    ]

    mock_pytube_client = mocker.patch("pytube.YouTube")
    mock_pytube_client.return_value.captions.all.return_value = captions_list

    video = mocker.Mock()
    assert youtube.get_captions_for_video(video) == "English: Auto-generated"


def test_get_captions_for_video_no_english_caption(mocker):
    """Test fetching caption data for a video with no english caption available"""
    captions_list = [mock_pytube_caption_object("es", "Spanish", "Spanish")]

    mock_pytube_client = mocker.patch("pytube.YouTube")
    mock_pytube_client.return_value.captions.all.return_value = captions_list

    video = mocker.Mock()
    assert youtube.get_captions_for_video(video) is None


def test_parse_video_captions(mock_raw_caption_data, mock_parsed_transcript_data):
    """Test for youtube.parse_video_captions"""
    assert (
        youtube.parse_video_captions(mock_raw_caption_data)
        == mock_parsed_transcript_data
    )


@pytest.mark.usefixtures("mocked_channel_response")
def test_extract(mocker, mock_video_data, mock_video_batch_data):
    """Test youtube video ETL extract"""
    mock_video_client = mocker.patch("course_catalog.etl.youtube.get_youtube_client")
    mock_video_client.return_value.playlistItems.return_value.list.return_value.execute.side_effect = [
        mock_list_items_data("token"),
        mock_list_items_data(),
        mock_list_items_data(),
    ]

    mock_video_client.return_value.videos.return_value.list.return_value.execute.return_value = (
        mock_video_batch_data
    )

    assert list(youtube.extract()) == [
        ("MIT", mock_video_data),
        ("MIT", mock_video_data),
        ("OCW", mock_video_data),
    ]


@pytest.mark.usefixtures("mocked_channel_response")
@pytest.mark.usefixtures("video_settings")
def test_extract_with_bad_channel_id(mocker, mock_video_data, mock_video_batch_data):
    """Test youtube video ETL extract with a playlist for which the google api throws an error"""
    mock_video_client = mocker.patch("course_catalog.etl.youtube.get_youtube_client")
    mock_video_client.return_value.playlistItems.return_value.list.return_value.execute.side_effect = [
        googleapiclient.errors.HttpError(MagicMock(), bytes()),
        mock_list_items_data(),
    ]

    mock_video_client.return_value.videos.return_value.list.return_value.execute.return_value = (
        mock_video_batch_data
    )

    assert list(youtube.extract()) == [("OCW", mock_video_data)]


def test_extract_with_unset_keys(settings):
    """Test youtube video ETL extract with no keys set"""

    settings.YOUTUBE_CONFIG_FILE_LOCATION = None
    settings.YOUTUBE_DEVELOPER_KEY = None

    assert list(youtube.extract()) == []


@pytest.mark.usefixtures("video_settings")
@pytest.mark.usefixtures("mocked_channel_response")
@pytest.mark.parametrize("yaml_parser_response", [None, []])
def test_extract_with_no_channels(mocker, yaml_parser_response):
    """Test youtube video ETL extract with no channels in data"""
    mocker.patch("course_catalog.etl.youtube.get_youtube_client")
    mocker.patch("yaml.safe_load", return_value=yaml_parser_response)

    assert list(youtube.extract()) == []


def test_transform_single_video(mock_video_data):
    """test youtube transform for singe video"""
    assert youtube.transform_single_video(
        "OCW", mock_video_data
    ) == mock_normalized_video_data("OCW", mock_video_data)


def test_transform(mock_video_data):
    """test youtube transform"""

    raw_data = [
        ("MIT", mock_video_data),
        ("MIT", mock_video_data),
        ("OCW", mock_video_data),
    ]

    assert list(youtube.transform(raw_data)) == [
        mock_normalized_video_data("MIT", mock_video_data),
        mock_normalized_video_data("MIT", mock_video_data),
        mock_normalized_video_data("OCW", mock_video_data),
    ]
