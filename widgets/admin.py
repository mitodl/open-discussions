"""Widget admin interface"""
from django import forms
from django.contrib import admin
from django_json_widget.widgets import JSONEditorWidget

from widgets.models import WidgetInstance, WidgetList
from widgets.serializers.utils import get_widget_type_names


class WidgetInstanceForm(forms.ModelForm):
    """Custom admin form for WidgetInstances"""

    class Meta:
        model = WidgetInstance
        fields = ("title", "widget_type", "position", "configuration")
        widgets = {
            "widget_type": forms.Select(
                choices=[(name, name) for name in get_widget_type_names()]
            ),
            "configuration": JSONEditorWidget(),
        }


class WidgetInstanceInline(admin.StackedInline):
    """Inline admin interface for instances"""

    model = WidgetInstance
    form = WidgetInstanceForm
    extra = 0


@admin.register(WidgetList)
class WidgetListAdmin(admin.ModelAdmin):
    """WidgetList admin form"""

    model = WidgetList

    inlines = [WidgetInstanceInline]
