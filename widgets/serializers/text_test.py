"""Tests for text widget serializer"""
import pytest

from widgets.factories import WidgetInstanceFactory
from widgets.serializers.text import TextWidgetSerializer


@pytest.mark.django_db
def test_url_widget_serialize():
    """Tests that the text widget serializes correctly"""
    widget_instance = WidgetInstanceFactory.create(type_text=True)

    assert TextWidgetSerializer(widget_instance).data == {
        "id": widget_instance.id,
        "widget_type": "Text",
        "title": widget_instance.title,
        "configuration": widget_instance.configuration,
        "react_renderer": "default",
        "html": "<div>{}</div>".format(widget_instance.configuration["body"]),
    }
