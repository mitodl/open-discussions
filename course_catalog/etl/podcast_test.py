"""Tests for Podcast ETL functions"""

from unittest.mock import Mock
import datetime
import pytest
from bs4 import BeautifulSoup as bs
import yaml
from course_catalog.etl.podcast import extract, transform


def rss_content():
    """Test rss data"""

    with open("./test_html/test_podcast.rss") as f:
        content = f.read()

    return content


def mock_podcast_file(podcast_title=None, topics=None):
    """Mock podcast github file"""

    content = f"""---
rss_url: rss_url
{ "podcast_title: " + podcast_title if podcast_title else "" }
{ "topics: " + topics if topics else "" }
offered_by: A department
website:  website_url
"""
    return Mock(decoded_content=content)


@pytest.fixture(autouse=True)
def mock_rss_request(mocker):
    """
    Mock request data
    """

    mocker.patch(
        "course_catalog.etl.see.requests.get",
        side_effect=[mocker.Mock(content=rss_content())],
    )


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


@pytest.mark.parametrize("title", [None, "Custom Title"])
@pytest.mark.parametrize("topics", [None, "Science, Technology"])
def test_transform(mocker, title, topics):
    """Test transform function"""
    podcast_list = [mock_podcast_file(title, topics)]
    mock_github_client = mocker.patch("github.Github")
    mock_github_client.return_value.get_repo.return_value.get_contents.return_value = (
        podcast_list
    )

    expected_topics = [{"name": topic} for topic in topics.split(",")] if topics else []

    expected_title = title if title else "A Podcast"

    expected_results = [
        {
            "podcast_id": "d4c3dcd45dc93fbc9c3634ba0545c2e0",
            "title": expected_title,
            "offered_by": [{"name": "A department"}],
            "full_description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            "short_description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            "image_src": "apicture.jpg",
            "published": True,
            "url": "website_url",
            "topics": expected_topics,
            "episodes": [
                {
                    "episode_id": "fefc732682f83d1a8945eebcae5364b4",
                    "title": "Episode1",
                    "offered_by": [{"name": "A department"}],
                    "short_description": "SMorbi id consequat nisl. Morbi leo elit, vulputate nec aliquam molestie, ullamcorper sit amet tortor",
                    "full_description": "SMorbi id consequat nisl. Morbi leo elit, vulputate nec aliquam molestie, ullamcorper sit amet tortor",
                    "url": "http://feeds.soundcloud.com/stream/episode1.mp3",
                    "image_src": "image2.jpg",
                    "last_modified": datetime.datetime(
                        2020, 4, 1, 18, 20, 31, tzinfo=datetime.timezone.utc
                    ),
                    "published": True,
                    "duration": "00:17:16",
                    "topics": expected_topics,
                    "runs": [
                        {
                            "run_id": "fefc732682f83d1a8945eebcae5364b4",
                            "platform": "podcast",
                            "prices": [{"price": 0}],
                        }
                    ],
                },
                {
                    "episode_id": "e56d3047fad337ca85b577c60ff6a8da",
                    "title": "Episode2",
                    "offered_by": [{"name": "A department"}],
                    "short_description": "Praesent fermentum suscipit metus nec aliquam. Proin hendrerit felis ut varius facilisis.",
                    "full_description": "Praesent fermentum suscipit metus nec aliquam. Proin hendrerit felis ut varius facilisis.",
                    "url": "http://feeds.soundcloud.com/stream/episode2.mp3",
                    "image_src": "image1.jpg",
                    "last_modified": datetime.datetime(
                        2020, 4, 1, 18, 20, 31, tzinfo=datetime.timezone.utc
                    ),
                    "published": True,
                    "duration": "00:17:16",
                    "topics": expected_topics,
                    "runs": [
                        {
                            "run_id": "e56d3047fad337ca85b577c60ff6a8da",
                            "platform": "podcast",
                            "prices": [{"price": 0}],
                        }
                    ],
                },
            ],
            "runs": [
                {
                    "run_id": "d4c3dcd45dc93fbc9c3634ba0545c2e0",
                    "platform": "podcast",
                    "prices": [{"price": 0}],
                }
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
