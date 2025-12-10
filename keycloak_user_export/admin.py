"""keycloak_user_export admin"""
from django.contrib import admin

from keycloak_user_export.models import UserExportToKeycloak


class UserExportToKeycloakAdmin(admin.ModelAdmin):
    """Admin for UserExportToKeycloak"""

    model = UserExportToKeycloak
    list_display = ["id", "user"]
    search_fields = ["user__email", "user__username"]


admin.site.register(UserExportToKeycloak, UserExportToKeycloakAdmin)
