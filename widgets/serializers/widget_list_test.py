"""Tests for widget list serializer"""
import pytest

from widgets.factories import WidgetInstanceFactory, WidgetListFactory
from widgets.serializers.widget_list import WidgetListSerializer
from widgets.views_test import EXPECTED_AVAILABLE_WIDGETS

pytestmark = [pytest.mark.django_db]


def test_missing_widget_type():
    """If a widget type is in the database but not in the serializer map, it should be ignored"""
    widget_list = WidgetListFactory.create()
    WidgetInstanceFactory.create(widget_list=widget_list, widget_type="not_A_real_type")
    assert WidgetListSerializer(widget_list).data == {
        "available_widgets": EXPECTED_AVAILABLE_WIDGETS,
        "widgets": [],
        "id": widget_list.id,
    }
