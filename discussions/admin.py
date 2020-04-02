"""Discussions admin"""
from django.contrib import admin

from discussions import api
from discussions.models import Channel


class ChannelAdmin(admin.ModelAdmin):
    """Admin for channels"""

    model = Channel

    readonly_fields = ("contributor_group", "moderator_group")

    def save_model(self, request, obj, form, change):
        """Save the model"""
        if not change:
            contributor_group, moderator_group = api.channels.create_channel_groups(
                obj.name
            )
            obj.contributor_group = contributor_group
            obj.moderator_group = moderator_group

        super().save_model(request, obj, form, change)

        # obj has an id now
        api.channels.set_channel_permissions(obj)

    def can_delete(self, obj):  # pylint: disable=unused-argument
        """For now, don't allow deletes"""
        return False


admin.site.register(Channel, ChannelAdmin)
