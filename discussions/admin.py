"""Discussions admin"""
from bitfield import BitField
from bitfield.forms import BitFieldCheckboxSelectMultiple
from django.contrib import admin

from discussions import api
from discussions.models import Channel
from widgets.models import WidgetList


class ChannelAdmin(admin.ModelAdmin):
    """Admin for channels"""

    model = Channel

    readonly_fields = (
        "contributor_group",
        "moderator_group",
        "widget_list",
        "updated_on",
        "created_on",
    )

    formfield_overrides = {BitField: {"widget": BitFieldCheckboxSelectMultiple}}

    list_display = ("name", "title")

    def save_model(self, request, obj, form, change):
        """Save the model"""
        if not change:
            contributor_group, moderator_group = api.channels.create_channel_groups(
                obj.name
            )
            obj.contributor_group = contributor_group
            obj.moderator_group = moderator_group
            obj.widget_list = WidgetList.objects.create()

        super().save_model(request, obj, form, change)

        # obj has an id now
        api.channels.set_channel_permissions(obj)

    def can_delete(self, obj):  # pylint: disable=unused-argument
        """For now, don't allow deletes"""
        return False


admin.site.register(Channel, ChannelAdmin)
