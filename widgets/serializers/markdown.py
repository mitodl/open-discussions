"""Markdown widget serializer"""
from widgets.serializers.react_fields import ReactMarkdownWysiwygField
from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)


class MarkdownWidgetSerializerConfigSerializer(WidgetConfigSerializer):
    """Serializer for MarkdownWidgetSerializer config"""

    source = ReactMarkdownWysiwygField(help_text="Enter widget text", label="Text")


class MarkdownWidgetSerializer(WidgetInstanceSerializer):
    """Widget class for displaying markdown"""

    configuration_serializer_class = MarkdownWidgetSerializerConfigSerializer

    name = "Markdown"
    description = "Rich Text"
