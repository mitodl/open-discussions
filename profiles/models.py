"""Profile models"""
from django.db import models
from django.conf import settings

# This matches ImageField.max_length
MAX_IMAGE_FIELD_LENGTH = 100


class Profile(models.Model):
    """Profile model"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL)

    name = models.TextField(blank=True, null=True)

    image = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)
    image_small = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)
    image_medium = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)
