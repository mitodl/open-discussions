"""Profile models"""
from uuid import uuid4

from django.db import models, transaction
from django.conf import settings

from open_discussions import features
from profiles.utils import (
    profile_image_upload_uri,
    profile_image_upload_uri_medium,
    profile_image_upload_uri_small,
    default_profile_image, image_uri,
    make_thumbnail)

# Max dimension of either height or width for small and medium images
IMAGE_SMALL_MAX_DIMENSION = 64
IMAGE_MEDIUM_MAX_DIMENSION = 128

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

COMPLETE_PROPS = (
    'name',
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

    image_file = models.ImageField(null=True, max_length=2083, upload_to=profile_image_upload_uri)
    image_small_file = models.ImageField(null=True, max_length=2083, upload_to=profile_image_upload_uri_small)
    image_medium_file = models.ImageField(null=True, max_length=2083, upload_to=profile_image_upload_uri_medium)

    email_optin = models.NullBooleanField()
    toc_optin = models.NullBooleanField()

    last_active_on = models.DateTimeField(null=True)

    headline = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)

    @property
    def is_complete(self):
        """
        Checks if the profile is complete or not

        Returns:
             (bool): True if the profile is complete, False otherwise
        """
        if not features.is_enabled(features.PROFILE_UI):
            return True
        if image_uri(self.user) == default_profile_image:
            return False
        for prop in COMPLETE_PROPS:
            if not getattr(self, prop):
                return False
        return True

    @transaction.atomic
    def save(self, *args, update_image=False, **kwargs):  # pylint: disable=arguments-differ
        """Update thumbnails if necessary"""
        if update_image:
            if self.image_file:
                small_thumbnail = make_thumbnail(self.image_file.file, IMAGE_SMALL_MAX_DIMENSION)
                medium_thumbnail = make_thumbnail(self.image_file, IMAGE_MEDIUM_MAX_DIMENSION)

                # name doesn't matter here, we use upload_to to produce that
                self.image_small_file.save("{}.jpg".format(uuid4().hex), small_thumbnail)
                self.image_medium_file.save("{}.jpg".format(uuid4().hex), medium_thumbnail)
            else:
                self.image_small_file = None
                self.image_medium_file = None

        super(Profile, self).save(*args, **kwargs)

    def __str__(self):
        return "{}".format(self.name)
