""" Admin for channels """
from django.contrib import admin

from moira_lists.models import MoiraList


class MoiraListAdmin(admin.ModelAdmin):
    """Admin for Moira Lists"""

    model = MoiraList
    search_fields = ("name",)


admin.site.register(MoiraList, MoiraListAdmin)
