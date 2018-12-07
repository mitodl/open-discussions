"""Tests for markdown widget serializer"""
import pytest

from widgets.factories import WidgetInstanceFactory
from widgets.serializers.markdown import MarkdownWidgetSerializer


@pytest.mark.django_db
def test_markdownl_widget_serialize():
    """Tests that the markdown widget serializes correctly"""
    widget_instance = WidgetInstanceFactory.create(type_markdown=True)

    assert MarkdownWidgetSerializer(widget_instance).data == {
        "id": widget_instance.id,
        "widget_type": "Markdown",
        "title": widget_instance.title,
        "configuration": widget_instance.configuration,
        "react_renderer": "markdown",
        "html": None,
    }
