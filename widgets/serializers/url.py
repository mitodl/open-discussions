"""URL widget"""
from django.utils.html import format_html

from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)
from widgets.serializers.react_fields import ReactURLField


class URLWidgetConfigSerializer(WidgetConfigSerializer):
    """Serializer for URLWidget config"""

    url = ReactURLField(help_text="Enter URL", label="URL")


class URLWidgetSerializer(WidgetInstanceSerializer):
    """A basic url widget"""

    configuration_serializer_class = URLWidgetConfigSerializer

    name = "URL"
    description = "Embedded URL"

    def get_html(self, instance):
        """Renders the widget to html based on configuration"""
        return format_html(
            '<iframe src="{url}"></iframe>', url=instance.configuration["url"]
        )
