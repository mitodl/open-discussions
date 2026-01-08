"""URL widget"""
from widgets.serializers.react_fields import ReactCharField, ReactURLField
from widgets.serializers.widget_instance import (
    WidgetConfigSerializer,
    WidgetInstanceSerializer,
)


class URLWidgetConfigSerializer(WidgetConfigSerializer):
    """Serializer for URLWidget config"""

    url = ReactURLField(
        help_text="Enter URL",
        label="URL",
        under_text="Paste url from YouTube, New York Times, Instragram and more than 400 content providers. Or any other web url",
        show_embed=True,
        required=False,
        allow_null=True,
    )
    custom_html = ReactCharField(
        help_text="For more specific embeds, enter the embed code here",
        under_text="For security reasons, we only allow embed code from Twitter. If you have something else in mind, contact us.",
        default=None,
        required=False,
        allow_null=True,
    )


class URLWidgetSerializer(WidgetInstanceSerializer):
    """A basic url widget"""

    configuration_serializer_class = URLWidgetConfigSerializer

    name = "URL"
    description = "Embedded URL"
