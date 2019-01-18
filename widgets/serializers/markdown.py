"""Markdown widget serializer"""
from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)
from widgets.serializers.react_fields import ReactMarkdownWysiwygField


class MarkdownWidgetSerializerConfigSerializer(WidgetConfigSerializer):
    """Serializer for MarkdownWidgetSerializer config"""

    source = ReactMarkdownWysiwygField(help_text="Enter widget text", label="Text")


class MarkdownWidgetSerializer(WidgetInstanceSerializer):
    """Widget class for displaying markdown"""

    configuration_serializer_class = MarkdownWidgetSerializerConfigSerializer

    name = "Markdown"
    description = "Rich Text"
