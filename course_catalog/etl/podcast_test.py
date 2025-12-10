"""Tests for Podcast ETL functions"""

import datetime
from unittest.mock import Mock
from urllib.parse import urljoin

import pytest
import pytz
import yaml
from bs4 import BeautifulSoup as bs
from django.conf import settings
from freezegun import freeze_time

from course_catalog.etl.podcast import (
    extract,
    generate_aggregate_podcast_rss,
    transform,
)
from course_catalog.factories import PodcastEpisodeFactory


def rss_content():
    """Test rss data"""
    with open("./test_html/test_podcast.rss") as f:
        content = f.read()

    return content


def mock_podcast_file(  # pylint: disable=too-many-arguments
    podcast_title=None,
    topics=None,
    website_url="website_url",
    offered_by=None,
    google_podcasts_url="google_podcasts_url",
    apple_podcasts_url="apple_podcasts_url",
    rss_url="rss_url",
):
    """Mock podcast github file"""
    content = f"""---
rss_url: rss_url
{ "podcast_title: " + podcast_title if podcast_title else "" }
{ "topics: " + topics if topics else "" }
{ "offered_by: " + offered_by if offered_by else "" }
website:  {website_url}
google_podcasts_url: {google_podcasts_url}
apple_podcasts_url: {apple_podcasts_url}
rss_url: {rss_url}
"""
    return Mock(decoded_content=content)


@pytest.fixture
def mock_rss_request(mocker):
    """Mock request data
    """
    mocker.patch(
        "course_catalog.etl.podcast.requests.get",
        side_effect=[mocker.Mock(content=rss_content())],
    )


@pytest.fixture
def mock_rss_request_with_bad_rss_file(mocker):
    """Mock request data
    """
    mocker.patch(
        "course_catalog.etl.podcast.requests.get",
        side_effect=[mocker.Mock(content=""), mocker.Mock(content=rss_content())],
    )


@pytest.mark.usefixtures("mock_rss_request")
def test_extract(mocker):
    """Test extract function"""
    podcast_list = [mock_podcast_file()]
    mock_github_client = mocker.patch("github.Github")
    mock_github_client.return_value.get_repo.return_value.get_contents.return_value = (
        podcast_list
    )

    results = list(extract())

    expected_content = bs(rss_content(), "xml")
    mock_config = mock_podcast_file()

    assert len(results) == 1

    assert results == [(expected_content, yaml.safe_load(mock_config.decoded_content))]


@pytest.mark.usefixtures("mock_rss_request")
@pytest.mark.parametrize("title", [None, "Custom Title"])
@pytest.mark.parametrize("topics", [None, "Science,  Technology"])
@pytest.mark.parametrize("offered_by", [None, "Department"])
def test_transform(mocker, title, topics, offered_by):
    """Test transform function"""
    podcast_list = [mock_podcast_file(title, topics, "website_url", offered_by)]
    mock_github_client = mocker.patch("github.Github")
    mock_github_client.return_value.get_repo.return_value.get_contents.return_value = (
        podcast_list
    )

    expected_topics = (
        [{"name": topic.strip()} for topic in topics.split(",")] if topics else []
    )

    expected_title = title if title else "A Podcast"

    expected_offered_by = [{"name": offered_by}] if offered_by else []

    episodes_rss = list(bs(rss_content(), "xml").find_all("item"))

    for episode in episodes_rss:
        episode.guid.string = f"d4c3dcd45dc93fbc9c3634ba0545c2e0: {episode.guid.text}"

    expected_results = [
        {
            "podcast_id": "d4c3dcd45dc93fbc9c3634ba0545c2e0",
            "title": expected_title,
            "offered_by": expected_offered_by,
            "full_description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            "short_description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            "image_src": "apicture.jpg",
            "published": True,
            "url": "website_url",
            "google_podcasts_url": "google_podcasts_url",
            "apple_podcasts_url": "apple_podcasts_url",
            "rss_url": "rss_url",
            "topics": expected_topics,
            "episodes": [
                {
                    "episode_id": "0a19bfc1f30334389fc039e716d35306",
                    "title": "Episode1",
                    "offered_by": expected_offered_by,
                    "short_description": "SMorbi id consequat nisl. Morbi leo elit, vulputate nec aliquam molestie, ullamcorper sit amet tortor",
                    "full_description": "SMorbi id consequat nisl. Morbi leo elit, vulputate nec aliquam molestie, ullamcorper sit amet tortor",
                    "url": "http://feeds.soundcloud.com/stream/episode1.mp3",
                    "episode_link": "https://soundcloud.com/podcast/episode1",
                    "image_src": "apicture.jpg",
                    "last_modified": datetime.datetime(
                        2020, 4, 1, 18, 20, 31, tzinfo=datetime.timezone.utc
                    ),
                    "published": True,
                    "duration": "00:17:16",
                    "topics": expected_topics,
                    "rss": episodes_rss[0].prettify(),
                },
                {
                    "episode_id": "85855fa506bf36999f8978302f3413ec",
                    "title": "Episode2",
                    "offered_by": expected_offered_by,
                    "short_description": "Praesent fermentum suscipit metus nec aliquam. Proin hendrerit felis ut varius facilisis.",
                    "full_description": "Praesent fermentum suscipit metus nec aliquam. Proin hendrerit felis ut varius facilisis.",
                    "url": "http://feeds.soundcloud.com/stream/episode2.mp3",
                    "episode_link": "https://soundcloud.com/podcast/episode2",
                    "image_src": "image1.jpg",
                    "last_modified": datetime.datetime(
                        2020, 4, 1, 18, 20, 31, tzinfo=datetime.timezone.utc
                    ),
                    "published": True,
                    "duration": "00:17:16",
                    "topics": expected_topics,
                    "rss": episodes_rss[1].prettify(),
                },
            ],
        }
    ]

    extract_results = extract()

    results = list(transform(extract_results))

    assert (
        list(
            [{**podcast, "episodes": list(podcast["episodes"])} for podcast in results]
        )
        == expected_results
    )


@pytest.mark.usefixtures("mock_rss_request_with_bad_rss_file")
def test_transform_with_error(mocker):
    """Test transform function with bad rss file"""
    mock_exception_log = mocker.patch("course_catalog.etl.podcast.log.exception")

    podcast_list = [mock_podcast_file(None, None, "website_url2"), mock_podcast_file()]
    mock_github_client = mocker.patch("github.Github")
    mock_github_client.return_value.get_repo.return_value.get_contents.return_value = (
        podcast_list
    )

    extract_results = extract()

    results = list(transform(extract_results))

    mock_exception_log.assert_called_once_with(
        "Error parsing podcast data from %s", "rss_url"
    )

    assert len(results) == 1
    assert results[0]["url"] == "website_url"


@pytest.mark.django_db
@freeze_time("2020-07-20")
def test_generate_aggregate_podcast_rss():
    """Testgenerate_aggregate_podcast_rss"""
    PodcastEpisodeFactory.create(
        rss="<item>rss1</item>",
        last_modified=datetime.datetime(2020, 2, 1, tzinfo=pytz.UTC),
    )
    PodcastEpisodeFactory.create(
        rss="<item>rss2</item>",
        last_modified=datetime.datetime(2020, 1, 1, tzinfo=pytz.UTC),
    )

    podcasts_url = urljoin(settings.SITE_BASE_URL, "podcasts")
    cover_image_url = urljoin(
        settings.SITE_BASE_URL, "/static/images/podcast_cover_art.png"
    )

    expected_rss = f"""<?xml version='1.0' encoding='UTF-8'?>
    <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">
        <channel>
            <title>MIT Open Aggregated Podcast Feed</title>
            <link>{podcasts_url}</link>
            <language>en-us</language>
            <pubDate>Mon, 20 Jul 2020  00:00:00 +0000</pubDate>
            <lastBuildDate>Mon, 20 Jul 2020  00:00:00 +0000</lastBuildDate>
            <ttl>60</ttl>
            <itunes:subtitle>Episodes from podcasts from around MIT</itunes:subtitle>
            <itunes:author>MIT Open Learning</itunes:author>
            <itunes:summary>Episodes from podcasts from around MIT</itunes:summary>
            <description>Episodes from podcasts from around MIT</description>
            <itunes:owner>
                <itunes:name>MIT Open Learning</itunes:name>
                <itunes:email>{settings.EMAIL_SUPPORT}</itunes:email>
            </itunes:owner>
            <image>
              <url>{cover_image_url}</url>
              <title>MIT Open Aggregated Podcast Feed</title>
              <link>{podcasts_url}</link>
            </image>
            <itunes:explicit>no</itunes:explicit>
            <itunes:category text="Education"/>
            <item>rss1</item>
            <item>rss2</item>
        </channel>
    </rss>"""

    result = generate_aggregate_podcast_rss().prettify()

    assert result == bs(expected_rss, "xml").prettify()
