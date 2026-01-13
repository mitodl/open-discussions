"""Widget serializer utils"""


def get_widget_classes():
    """Return the list of available widget classes

    Returns:
        list of WidgetInstanceSerializer: set of widget serializer classes

    """
    # NOTE: these imports are inline to avoid circular imports

    from widgets.serializers.markdown import MarkdownWidgetSerializer
    from widgets.serializers.people import PeopleWidgetSerializer
    from widgets.serializers.rss import RssFeedWidgetSerializer
    from widgets.serializers.url import URLWidgetSerializer

    return [
        MarkdownWidgetSerializer,
        URLWidgetSerializer,
        RssFeedWidgetSerializer,
        PeopleWidgetSerializer,
    ]


def get_widget_type_mapping():
    """Returns a mapping of available widgets"""
    return {widget_cls.name: widget_cls for widget_cls in get_widget_classes()}


def get_widget_type_names():
    """Returns a list of widget class names"""
    return [widget_cls.name for widget_cls in get_widget_classes()]
