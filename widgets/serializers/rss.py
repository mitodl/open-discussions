"""RSS widget"""
import time

import feedparser

from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)
from widgets.serializers.react_fields import ReactURLField, ReactIntegerField


ISOFORMAT = "%Y-%m-%dT%H:%M:%SZ"
MAX_FEED_ITEMS = 12


class RssFeedWidgetConfigSerializer(WidgetConfigSerializer):
    """Serializer for RssFeedWidget config"""

    url = ReactURLField(help_text="Enter RSS Feed URL", label="URL")
    feed_display_limit = ReactIntegerField(
        min_value=0, max_value=MAX_FEED_ITEMS, default=3
    )


class RssFeedWidgetSerializer(WidgetInstanceSerializer):
    """A basic rss feed widget"""

    configuration_serializer_class = RssFeedWidgetConfigSerializer

    name = "RSS Feed"
    description = "RSS Feed"

    def get_json(self, instance):
        """Renders the widget to html based on configuration"""
        rss = feedparser.parse(instance.configuration["url"])
        if not rss:
            return {"title": "RSS", "entries": []}

        timestamp_key = (
            "published_parsed"
            if rss.entries and "published_parsed" in rss.entries[0]
            else "updated_parsed"
        )
        sorted_feed = sorted(
            rss.entries, reverse=True, key=lambda entry: entry[timestamp_key]
        )
        display_limit = min(
            instance.configuration["feed_display_limit"], MAX_FEED_ITEMS
        )

        return {
            "title": instance.title,
            "entries": [
                {
                    "title": entry.get("title"),
                    "description": entry.get("description"),
                    "link": entry.get("link"),
                    "timestamp": time.strftime(ISOFORMAT, entry.get(timestamp_key))
                    if entry.get(timestamp_key)
                    else None,
                }
                for entry in sorted_feed[:display_limit]
            ],
        }
