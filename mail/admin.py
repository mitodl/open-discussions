"""
Admin site bindings for mail
"""

from django.contrib import admin

from .models import BlockedEmailRegex


class BlockedEmailRegexAdmin(admin.ModelAdmin):
    """Admin for BlockedEmailRegex"""

    model = BlockedEmailRegex
    list_display = ["match", "created_on", "updated_on"]
    search_fields = ["match"]


admin.site.register(BlockedEmailRegex, BlockedEmailRegexAdmin)
