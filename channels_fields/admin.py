"""Admin for channels_fields"""
from django.contrib import admin

from channels_fields.models import FieldChannel


class FieldChannelAdmin(admin.ModelAdmin):
    """FieldChannel admin model"""

    model = FieldChannel
    exclude = ("widget_list",)
    search_fields = ("name", "title")


admin.site.register(FieldChannel, FieldChannelAdmin)
