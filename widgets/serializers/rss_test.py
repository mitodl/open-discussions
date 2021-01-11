"""Tests for rss widget serializer"""
import time

import pytest
from rest_framework.serializers import ValidationError

from open_discussions.test_utils import PickleableMock
from widgets.factories import WidgetInstanceFactory, WidgetListFactory
from widgets.serializers import rss


@pytest.mark.django_db
@pytest.mark.parametrize("raise_exception", [True, False])
@pytest.mark.parametrize("timestamp_key", ["published_parsed", "updated_parsed"])
@pytest.mark.parametrize("item_count", [0, 8, 15])
@pytest.mark.parametrize("display_limit", [0, 6, 10, 14, 18])
def test_url_widget_serialize(
    mocker, raise_exception, timestamp_key, item_count, display_limit
):
    """Tests that the rss widget serializes correctly"""
    entries = sorted(
        [
            {
                "title": f"Title {idx}",
                "description": f"Description {idx}",
                "link": f"http://example.com/{idx}",
                timestamp_key: time.gmtime(),
            }
            for idx in range(item_count)
        ],
        reverse=True,
        key=lambda entry: entry[timestamp_key],
    )
    mock_parse = mocker.patch("feedparser.parse")
    if raise_exception:
        mock_parse.side_effect = Exception("bad")
    else:
        mock_parse.return_value = PickleableMock(entries=entries)
    widget_instance = WidgetInstanceFactory.create(type_rss=True)
    widget_instance.configuration["feed_display_limit"] = display_limit
    widget_instance.save()

    data = rss.RssFeedWidgetSerializer(widget_instance).data

    mock_parse.assert_called_once_with(widget_instance.configuration["url"])

    assert data == {
        "id": widget_instance.id,
        "widget_type": "RSS Feed",
        "title": widget_instance.title,
        "configuration": widget_instance.configuration,
        "json": {
            "title": widget_instance.title,
            "entries": []
            if raise_exception
            else [
                {
                    "title": entry["title"],
                    "description": entry["description"],
                    "link": entry["link"],
                    "timestamp": time.strftime(
                        "%Y-%m-%dT%H:%M:%SZ", entry[timestamp_key]
                    ),
                }
                for entry in entries[: min(rss.MAX_FEED_ITEMS, display_limit)]
            ],
        },
    }


@pytest.mark.django_db
@pytest.mark.parametrize("raise_exception", [True, False])
def test_url_widget_save(mocker, raise_exception):
    """Tests that the rss widget serializes correctly"""
    widget_list = WidgetListFactory.create()
    url = "http://example.com"
    data = {
        "widget_list_id": widget_list.id,
        "title": "Title",
        "widget_type": "RSS Feed",
        "position": 1,
        "configuration": {"url": url},
    }
    mock_parse = mocker.patch("feedparser.parse")
    if raise_exception:
        mock_parse.side_effect = Exception("bad")
    else:
        mock_parse.return_value = PickleableMock(entries=[])

    serializer = rss.RssFeedWidgetSerializer(data=data)
    serializer.is_valid()

    if raise_exception:
        with pytest.raises(ValidationError):
            serializer.save()
    else:
        serializer.save()

    mock_parse.assert_called_once_with(url)
