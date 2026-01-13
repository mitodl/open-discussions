"""Admin site bindings for profiles
"""

from django.contrib import admin

from .models import Profile


class ProfileAdmin(admin.ModelAdmin):
    """Admin for Profile"""

    model = Profile
    list_display = ["user", "name", "email_optin", "toc_optin"]
    search_fields = ["name", "user__email", "user__username"]
    list_filter = ["email_optin", "toc_optin", "user__is_active"]
    raw_id_fields = ("user",)
    readonly_fields = ("image", "image_small", "image_medium")


admin.site.register(Profile, ProfileAdmin)
