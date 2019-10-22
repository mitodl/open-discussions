"""Tests for Video ETL functions"""
# pylint: disable=redefined-outer-name
from unittest.mock import MagicMock
import pytest
import googleapiclient.errors
from course_catalog.etl import youtube


def mock_video_search_data(token=""):
    """Mock video search data"""
    data = {
        "etag": '"j6xRRd8dTPVVptg711_CSPADRfg/BcXH3l8f_4E3Blh2YR0v6NuPxAQ"',
        "items": [
            {
                "etag": '"j6xRRd8dTPVVptg711_CSPADRfg/AE0DGFijV8YKFde-0lAnu1RjIGY"',
                "id": {"kind": "youtube#video", "videoId": "CKwCYr41J-4"},
                "kind": "youtube#searchResult",
                "snippet": {
                    "channelId": "UCTBMWu8yshnAmpzR3MoJFtw",
                    "channelTitle": "MITx Videos",
                    "description": "Gordon Fullterton, NASA astronaut and research pilot, talks about how a visit from HRH Charles, Prince of Wales pointed out a serious flaw when testing the ...",
                    "liveBroadcastContent": "none",
                    "publishedAt": "2019-08-30T04:00:05.000Z",
                    "thumbnails": {},
                    "title": "Pitch and Roll and Prince Charles",
                },
            }
        ],
        "kind": "youtube#searchListResponse",
        "pageInfo": {"resultsPerPage": 50, "totalResults": 51},
        "regionCode": "US",
    }

    if token != "":
        data["nextPageToken"] = token

    return data


@pytest.fixture
def mock_video_data():
    """Mock data for a single video"""
    data = {
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
            "thumbnails": {},
        },
    }

    return data


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
    data = """
---
channels:
  - offered_by: MIT
    channel_id: channel1
  - offered_by: OCW
    channel_id: channel2
"""

    return data


@pytest.fixture
def mocked_channel_response(mocked_responses, mock_channel_data, video_settings):
    """Mock the channel catalog response"""
    mocked_responses.add(
        mocked_responses.GET,
        video_settings.YOUTUBE_CONFIG_FILE_LOCATION,
        body=mock_channel_data,
    )
    yield mocked_responses


@pytest.mark.usefixtures("mocked_channel_response")
def test_extract(mocker, mock_video_data, mock_video_batch_data):
    """Test youtube video ETL extract"""
    mock_video_client = mocker.patch("course_catalog.etl.youtube.get_youtube_client")
    mock_video_client.return_value.search.return_value.list.return_value.execute.side_effect = [
        mock_video_search_data("token"),
        mock_video_search_data(""),
        mock_video_search_data(""),
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
    """Test youtube video ETL extract with a channel for which the google api throws an error"""
    mock_video_client = mocker.patch("course_catalog.etl.youtube.get_youtube_client")
    mock_video_client.return_value.search.return_value.list.return_value.execute.side_effect = [
        googleapiclient.errors.HttpError(MagicMock(), bytes()),
        mock_video_search_data(""),
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
