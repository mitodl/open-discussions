"""
Link to user records that have been successfully exported to Keycloak.
"""
from django.db import models
from django.conf import settings


class UserExportToKeycloak(models.Model):
    """
    Link to user records that have been successfully exported to Keycloak.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    scim_location = models.CharField(default=None, max_length=1024)
