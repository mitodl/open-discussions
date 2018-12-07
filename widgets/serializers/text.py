"""Text widget"""
from django.utils.html import format_html

from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)
from widgets.serializers.react_fields import ReactCharField


class TextWidgetConfigSerializer(WidgetConfigSerializer):
    """Serializer for TextWidget config"""

    body = ReactCharField(help_text="Enter widget text")


class TextWidgetSerializer(WidgetInstanceSerializer):
    """A basic text widget"""

    configuration_serializer_class = TextWidgetConfigSerializer

    name = "Text"

    def get_html(self, instance):
        """Renders the widget to html based on configuration"""
        return format_html("<div>{body}</div>", body=instance.configuration["body"])
