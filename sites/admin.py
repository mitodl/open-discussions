"""Admin for sites"""
from django.contrib import admin

from sites.models import AuthenticatedSite


class AuthenticatedSiteAdmin(admin.ModelAdmin):
    """Admin for Authenticated site models"""

    pass


admin.site.register(AuthenticatedSite, AuthenticatedSiteAdmin)
