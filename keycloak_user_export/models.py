"""Link to user records that have been successfully exported to Keycloak.
"""
from django.conf import settings
from django.db import models


class UserExportToKeycloak(models.Model):
    """Link to user records that have been successfully exported to Keycloak.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, null=False, default="ADDED")
