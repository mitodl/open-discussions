""" Admin for channels """

from django.contrib import admin

from channels.models import Channel, ChannelInvitation


class ChannelAdmin(admin.ModelAdmin):
    """Customized Channel admin model"""

    model = Channel
    exclude = ("banner", "avatar", "widget_list", "allowed_post_types")
    search_fields = ("name",)
    readonly_fields = ("name",)
    list_filter = ("ga_tracking_id",)


admin.site.register(Channel, ChannelAdmin)


class ChannelInvitationAdmin(admin.ModelAdmin):
    """Customized ChannelInvitation admin model"""

    model = ChannelInvitation
    search_fields = ("email", "user__email", "inviter__email")

    def has_change_permission(self, request, obj=None):
        return False


admin.site.register(ChannelInvitation, ChannelInvitationAdmin)
