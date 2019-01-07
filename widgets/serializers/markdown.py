"""Markdown widget serializer"""
from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)
from widgets.serializers.react_fields import ReactMarkdownWysiwygField


class MarkdownWidgetSerializerConfigSerializer(WidgetConfigSerializer):
    """Serializer for MarkdownWidgetSerializer config"""

    source = ReactMarkdownWysiwygField(help_text="Enter widget text")


class MarkdownWidgetSerializer(WidgetInstanceSerializer):
    """Widget class for displaying markdown"""

    configuration_serializer_class = MarkdownWidgetSerializerConfigSerializer

    name = "Markdown"

    @classmethod
    def get_react_renderer(cls, *args):
        """Return the react renderer for the widget"""
        return "markdown"
