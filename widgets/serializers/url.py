"""URL widget"""
from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)
from widgets.serializers.react_fields import ReactURLField


class URLWidgetConfigSerializer(WidgetConfigSerializer):
    """Serializer for URLWidget config"""

    url = ReactURLField(help_text="Enter URL", label="URL", show_embed=True)


class URLWidgetSerializer(WidgetInstanceSerializer):
    """A basic url widget"""

    configuration_serializer_class = URLWidgetConfigSerializer

    name = "URL"
    description = "Embedded URL"
