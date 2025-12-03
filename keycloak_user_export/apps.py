"""keycloak_user_export app configs"""
from django.apps import AppConfig


class MicromastersImportConfig(AppConfig):
    """AppConfig for keycloak_user_export"""

    default_auto_field = "django.db.models.BigAutoField"
    name = "keycloak_user_export"
