"""WidgetInstnace serializer"""
from rest_framework import serializers

from open_discussions.serializers import WriteableSerializerMethodField
from widgets.models import WidgetInstance
from widgets.serializers.utils import get_widget_type_names


def _raise_not_implemented(*args, **kwargs):  # pylint: disable=unused-argument
    """Raises an error indicating this is not implemented"""
    raise NotImplementedError


class WidgetConfigSerializer(serializers.Serializer):
    """Serializer for widget configuration"""

    def get_form_spec(self):
        """Returns a specification for building/editing a widget"""
        return [field.get_field_spec() for key, field in self.fields.items()]


class WidgetInstanceSerializer(serializers.ModelSerializer):
    """WidgetInstance serializer"""

    name = None
    configuration_serializer_class = _raise_not_implemented

    widget_type = serializers.ChoiceField(choices=[])
    json = serializers.SerializerMethodField()
    configuration = WriteableSerializerMethodField()
    position = serializers.IntegerField(write_only=True)

    # this is only passed if the widget is being created
    widget_list_id = serializers.CharField(write_only=True, required=False)

    @classmethod
    def get_widget_spec(cls):
        """Returns a specification for building/editing a widget"""
        return {
            "widget_type": cls.name,
            "description": cls.description,
            "form_spec": cls.configuration_serializer_class().get_form_spec(),
        }

    def __init__(self, *args, **kwargs):
        self.fields["widget_type"].choices = get_widget_type_names()
        super().__init__(*args, **kwargs)

    def validate_configuration(self, value):
        """Returns configuration as validated by configuration_serializer_class"""
        if self.configuration_serializer_class is not _raise_not_implemented:
            serializer = self.configuration_serializer_class(data=value)
            serializer.is_valid(raise_exception=True)
            return {"configuration": serializer.data}

        # we'll end up here when WidgetListSerializer validates its widgets field
        return {"configuration": value}

    def get_configuration(self, instance):
        """Returns the configuration to serialize"""
        return instance.configuration

    def get_json(self, instance):  # pylint: disable=unused-argument
        """Renders the widget to json based on configuration"""
        return

    class Meta:
        model = WidgetInstance
        fields = (
            "id",
            "widget_type",
            "title",
            "configuration",
            "position",
            "widget_list_id",
            "json",
        )
        write_only = ("position", "widget_list_id")
        read_only = ("json",)
