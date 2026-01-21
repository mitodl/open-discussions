"""RSS widget"""
import logging
import time

import feedparser
from cache_memoize import cache_memoize
from django.conf import settings
from rest_framework.serializers import ValidationError

from open_discussions.constants import ISOFORMAT
from widgets.serializers.react_fields import ReactIntegerField, ReactURLField
from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)

MAX_FEED_ITEMS = 10

log = logging.getLogger()


class RssFeedWidgetConfigSerializer(WidgetConfigSerializer):
    """Serializer for RssFeedWidget config"""

    url = ReactURLField(help_text="RSS feed URL", label="URL")
    feed_display_limit = ReactIntegerField(
        min_value=1, max_value=MAX_FEED_ITEMS, default=5, label="Max number of items"
    )


@cache_memoize(settings.WIDGETS_RSS_CACHE_TTL, cache_alias="external_assets")
def _fetch_rss(url):
    """Fetches the RSS feed data

    Args:
        url (str): the RSS feed url to fetch

    Returns:
        feedparser.FeedParserDict: rss feed data

    """
    # NOTE: if you change what this function returns you need to ensure caches are evicted
    #       across all our environments, ideally in an automated way because cache_memoize
    #       won't know your implementation change. One possible way is to rename the function
    #       or change the arguments.
    return feedparser.parse(url)


class RssFeedWidgetSerializer(WidgetInstanceSerializer):
    """A basic rss feed widget"""

    configuration_serializer_class = RssFeedWidgetConfigSerializer

    name = "RSS Feed"
    description = "RSS Feed"

    def get_json(self, instance):
        """Obtains RSS feed data which will then be provided to the React component"""
        try:
            rss = _fetch_rss(instance.configuration["url"])
            entries = getattr(rss, "entries", [])
        except:  # pylint: disable=bare-except
            # log an exception and coerce this to an empty list so the feed and UI don't crash
            log.exception(
                "Error trying to refresh cached RSS feed for widget id: %s", instance.id
            )
            entries = []

        timestamp_key = (
            "published_parsed"
            if entries and "published_parsed" in entries[0]
            else "updated_parsed"
        )
        sorted_feed = sorted(
            entries, reverse=True, key=lambda entry: entry[timestamp_key]
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

    def save(self, **kwargs):
        """Saves the widget settings"""
        instance = super().save(**kwargs)

        url = instance.configuration["url"]

        try:
            # force a cache refresh immediately after a successful save by invalidating and then loading it
            _fetch_rss.invalidate(url)
            _fetch_rss(url)
        except:  # pylint: disable=bare-except
            log.exception("Error trying to load new RSS feed url: %s", url)
            raise ValidationError(
                {"configuration": f"Unable to load the RSS feed: '{url}'"}
            )

        return instance
