"""WidgetList serializer"""
from django.db import transaction
from rest_framework import serializers

from open_discussions.serializers import WriteableSerializerMethodField
from widgets.models import WidgetList
from widgets.serializers.utils import get_widget_classes, get_widget_type_mapping


def _serializer_for_widget_type(widget_type_name):
    """Returns the serializer for the widget_type name"""
    return get_widget_type_mapping().get(widget_type_name, None)


class WidgetListSerializer(serializers.ModelSerializer):
    """Serializer for WidgetLists"""

    widgets = WriteableSerializerMethodField()
    available_widgets = serializers.SerializerMethodField()

    def validate_widgets(self, value):
        """Validates the widgets by applying positioning data"""
        return {
            "widgets": [
                {**item, "position": position} for position, item in enumerate(value, 1)
            ]
        }

    def get_widgets(self, instance):
        """Returns the list of widgets"""
        widget_map = get_widget_type_mapping()
        return [
            _serializer_for_widget_type(widget.widget_type)(widget).data
            for widget in instance.widgets.all()
            if widget.widget_type in widget_map
        ]

    def get_available_widgets(self, instance):  # pylint: disable=unused-argument
        """Returns a list of available widgets"""
        return [
            serializer_cls.get_widget_spec() for serializer_cls in get_widget_classes()
        ]

    @transaction.atomic
    def update(self, instance, validated_data):
        """Updates the list of widgets under a WidgetList"""
        widgets_data = validated_data.pop("widgets", [])
        existing_widgets_by_id = {
            widget.id: widget for widget in instance.widgets.all()
        }
        widget_ids = {item["id"] for item in widgets_data if "id" in item}
        # Perform creations and updates.
        ret = []
        for data in widgets_data:
            widget_id = data.get("id", None)
            widget = existing_widgets_by_id.get(widget_id)
            widget_serializer_cls = _serializer_for_widget_type(data["widget_type"])

            if not widget:
                # if the widget provided was not in the data, ensure the user isn't trying to set id or widget_list_id
                if "id" in data:
                    del data["id"]
                data["widget_list_id"] = instance.id

            serializer = widget_serializer_cls(widget, data=data)
            serializer.is_valid(raise_exception=True)
            ret.append(serializer.save())

        # Perform deletions.
        for widget_id, widget in existing_widgets_by_id.items():
            if widget_id not in widget_ids:
                widget.delete()

        # reload so we don't have any issues with cached queries
        return WidgetList.objects.get(id=instance.id)

    class Meta:
        model = WidgetList
        fields = ("id", "widgets", "available_widgets")
        read_only_fields = ("id", "available_widgets")
