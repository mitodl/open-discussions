from django.db import models
from django.conf import settings


class UserExportToKeycloak(models.Model):
    """
    Link user records and a boolean indicator of whether the user has been successfully exported to Keycloak.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
