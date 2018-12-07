"""RSS widget"""
import time

from django.utils.html import format_html
import feedparser

from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)
from widgets.serializers.react_fields import ReactURLField, ReactIntegerField

MAX_FEED_ITEMS = 12
TIMESTAMP_FORMAT = "%m/%d %I:%M%p"


class RssFeedWidgetConfigSerializer(WidgetConfigSerializer):
    """Serializer for RssFeedWidget config"""

    url = ReactURLField(help_text="Enter RSS Feed URL")
    feed_display_limit = ReactIntegerField(
        min_value=0, max_value=MAX_FEED_ITEMS, default=3
    )


class RssFeedWidgetSerializer(WidgetInstanceSerializer):
    """A basic rss feed widget"""

    configuration_serializer_class = RssFeedWidgetConfigSerializer

    name = "RSS Feed"

    def get_html(self, instance):
        """Renders the widget to html based on configuration"""
        feed = feedparser.parse(instance.configuration["url"]).entries
        if not feed:
            return (
                "<p>No RSS entries found. You may have selected an invalid RSS url.</p>"
            )
        timestamp_key = (
            "published_parsed" if "published_parsed" in feed[0] else "updated_parsed"
        )
        sorted_feed = sorted(feed, reverse=True, key=lambda entry: entry[timestamp_key])
        display_limit = min(
            instance.configuration["feed_display_limit"], MAX_FEED_ITEMS
        )
        formatted_items = []
        for entry in sorted_feed[:display_limit]:
            entry_title = entry.get("title", None)
            entry_link = entry.get("link", None)
            entry_timestamp = entry.get(timestamp_key, None)
            if entry_timestamp:
                entry_timestamp = time.strftime(TIMESTAMP_FORMAT, entry_timestamp)
            formatted_items.append(
                format_html(
                    '<p><a href="{entry_link}">{entry_timestamp} | {entry_title}<a><p>',
                    entry_link=entry_link,
                    entry_timestamp=entry_timestamp,
                    entry_title=entry_title,
                )
            )
        return "\n".join(formatted_items)
