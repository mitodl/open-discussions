"""
Admin site bindings for authentication
"""

from django.contrib import admin
from django.contrib.admin import forms

from authentication.models import BlockedEmailRegex, BlockedIPRange


class BlockedEmailRegexAdmin(admin.ModelAdmin):
    """Admin for BlockedEmailRegex"""

    model = BlockedEmailRegex
    list_display = ["match", "created_on", "updated_on"]
    search_fields = ["match"]


admin.site.register(BlockedEmailRegex, BlockedEmailRegexAdmin)


# class BlockedIPRangeAdminForm(forms.ModelForm):
#     def clean_name(self):
#         # do something that validates your data
#         return self.cleaned_data["name"]
#


class BlockedIPRangeAdmin(admin.ModelAdmin):
    """Admin for BlockedIPRange"""

    # form = BlockedIPRangeAdminForm
    model = BlockedIPRange
    list_display = ["ip_start", "ip_end", "created_on", "updated_on"]
    search_fields = ["ip_start", "ip_end"]


admin.site.register(BlockedIPRange, BlockedIPRangeAdmin)
