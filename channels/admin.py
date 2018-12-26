""" Admin for channels """

from django.contrib import admin

from channels.models import Channel


class ChannelAdmin(admin.ModelAdmin):
    """Customized Channel admin model"""

    model = Channel
    exclude = ("banner", "avatar", "widget_list")
    search_fields = ("name",)
    readonly_fields = ("name",)
    list_filter = ("ga_tracking_id",)


admin.site.register(Channel, ChannelAdmin)
