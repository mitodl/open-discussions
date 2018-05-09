"""Profile models"""
from django.db import models
from django.conf import settings

MAX_IMAGE_FIELD_LENGTH = 1024
PROFILE_PROPS = (
    'name',
    'image',
    'image_small',
    'image_medium',
    'email_optin',
    'toc_optin',
    'headline',
    'bio',
)


class Profile(models.Model):
    """Profile model"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL)

    name = models.TextField(blank=True, null=True)

    image = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)
    image_small = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)
    image_medium = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)

    email_optin = models.NullBooleanField()
    toc_optin = models.NullBooleanField()

    last_active_on = models.DateTimeField(null=True)

    headline = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)

    def __str__(self):
        return "{}".format(self.name)
