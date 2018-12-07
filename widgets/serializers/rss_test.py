"""Tests for rss widget serializer"""
import time

import pytest

from widgets.factories import WidgetInstanceFactory
from widgets.serializers import rss


@pytest.mark.django_db
@pytest.mark.parametrize("timestamp_key", ["published_parsed", "updated_parsed"])
@pytest.mark.parametrize("item_count", [0, 8, 15])
@pytest.mark.parametrize("display_limit", [0, 6, 10, 14, 18])
def test_url_widget_serialize(mocker, timestamp_key, item_count, display_limit):
    """Tests that the rss widget serializes correctly"""
    entries = [
        {
            "title": f"Title {idx}",
            "link": f"http://example.com/{idx}",
            (timestamp_key): time.gmtime(),
        }
        for idx in range(item_count)
    ]
    mock_parse = mocker.patch(
        "feedparser.parse", return_value=mocker.Mock(entries=entries)
    )
    widget_instance = WidgetInstanceFactory.create(type_rss=True)
    widget_instance.configuration["feed_display_limit"] = display_limit
    widget_instance.save()

    data = rss.RssFeedWidgetSerializer(widget_instance).data

    mock_parse.assert_called_once_with(widget_instance.configuration["url"])

    # we'll check the hmtl differently than a direct equality check
    html = data.pop("html")
    assert data == {
        "id": widget_instance.id,
        "widget_type": "RSS Feed",
        "title": widget_instance.title,
        "configuration": widget_instance.configuration,
        "react_renderer": "default",
    }

    if item_count == 0:
        assert (
            html
            == "<p>No RSS entries found. You may have selected an invalid RSS url.</p>"
        )
    else:
        lines = html.splitlines()
        assert len(lines) == min(len(entries), min(display_limit, rss.MAX_FEED_ITEMS))
        assert lines == [
            '<p><a href="{}">{} | {}<a><p>'.format(
                entry["link"],
                time.strftime(rss.TIMESTAMP_FORMAT, entry[timestamp_key]),
                entry["title"],
            )
            for entry in entries[: len(lines)]
        ]
