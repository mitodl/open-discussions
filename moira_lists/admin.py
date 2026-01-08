"""Admin for channels"""
from django.contrib import admin

from moira_lists.models import MoiraList


class MoiraListAdmin(admin.ModelAdmin):
    """Admin for Moira Lists"""

    model = MoiraList
    search_fields = ("name", "users__email")
    readonly_fields = ("users", "name")

    def has_change_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return False


admin.site.register(MoiraList, MoiraListAdmin)
