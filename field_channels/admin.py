"""Admin for field_channels"""
from django.contrib import admin
from django.contrib.postgres import fields

from field_channels.models import FieldChannel, Subfield, SubfieldList, FieldSubfield
from open_discussions.utils import get_field_names


class FieldChannelAdmin(admin.ModelAdmin):
    """FieldChannel admin model"""

    model = FieldChannel
    exclude = ("banner", "avatar", "widget_list")
    search_fields = ("name", "title")


admin.site.register(FieldChannel, FieldChannelAdmin)


class SubfieldAdmin(admin.ModelAdmin):
    """Subfield admin model"""

    model = Subfield
    search_fields = ("title", "field__name", "field__title")

    def has_change_permission(self, request, obj=None):
        return True

admin.site.register(Subfield, SubfieldAdmin)


class FieldSubfieldAdmin(admin.ModelAdmin):
    """FieldSubfield admin model"""

    model = FieldSubfield
    search_fields = ("subfield_name", "subfield_title", "field__name", "field__title")

    def has_change_permission(self, request, obj=None):
        return True

admin.site.register(FieldSubfield, FieldSubfieldAdmin)


class SubfieldListAdmin(admin.ModelAdmin):
    """Subfield admin model"""

    model = SubfieldList
    search_fields = ("list__name", "subfield__name")

    def has_change_permission(self, request, obj=None):
        return True


admin.site.register(SubfieldList, SubfieldListAdmin)
