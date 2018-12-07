"""Tests for url widget serializer"""
import pytest

from widgets.factories import WidgetInstanceFactory
from widgets.serializers.url import URLWidgetSerializer


@pytest.mark.django_db
def test_url_widget_serialize():
    """Tests that the url widget serializes correctly"""
    widget_instance = WidgetInstanceFactory.create(type_url=True)

    assert URLWidgetSerializer(widget_instance).data == {
        "id": widget_instance.id,
        "widget_type": "URL",
        "title": widget_instance.title,
        "configuration": widget_instance.configuration,
        "react_renderer": "default",
        "html": '<iframe src="{}"></iframe>'.format(
            widget_instance.configuration["url"]
        ),
    }
