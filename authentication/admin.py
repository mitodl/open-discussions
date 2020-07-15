"""
Admin site bindings for authentication
"""

from django.contrib import admin

from authentication.models import BlockedEmailRegex


class BlockedEmailRegexAdmin(admin.ModelAdmin):
    """Admin for BlockedEmailRegex"""

    model = BlockedEmailRegex
    list_display = ["match", "created_on", "updated_on"]
    search_fields = ["match"]


admin.site.register(BlockedEmailRegex, BlockedEmailRegexAdmin)
