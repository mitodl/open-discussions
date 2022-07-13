"""Profile models"""
from uuid import uuid4

from django.contrib.postgres.fields import JSONField
from django.db import models, transaction
from django.conf import settings

from profiles.utils import (
    profile_image_upload_uri,
    profile_image_upload_uri_medium,
    profile_image_upload_uri_small,
    make_thumbnail,
    MAX_IMAGE_FIELD_LENGTH,
    IMAGE_SMALL_MAX_DIMENSION,
    IMAGE_MEDIUM_MAX_DIMENSION,
)

PROFILE_PROPS = (
    "name",
    "image",
    "image_small",
    "image_medium",
    "email_optin",
    "toc_optin",
    "headline",
    "bio",
)
FACEBOOK_DOMAIN = "facebook"
TWITTER_DOMAIN = "twitter"
LINKEDIN_DOMAIN = "linkedin"
PERSONAL_SITE_TYPE = "personal"
SITE_TYPE_OPTIONS = {
    FACEBOOK_DOMAIN,
    TWITTER_DOMAIN,
    LINKEDIN_DOMAIN,
    PERSONAL_SITE_TYPE,
}
SOCIAL_SITE_NAME_MAP = {
    FACEBOOK_DOMAIN: "Facebook",
    TWITTER_DOMAIN: "Twitter",
    LINKEDIN_DOMAIN: "LinkedIn",
}


def filter_profile_props(data):
    """
    Filters the passed profile data to valid profile fields

    Args:
        data (dict): profile data

    Return:
        dict: filtered dict
    """
    return {key: value for key, value in data.items() if key in PROFILE_PROPS}


class Profile(models.Model):
    """Profile model"""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    name = models.TextField(blank=True, null=True)

    image = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)
    image_small = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)
    image_medium = models.CharField(null=True, max_length=MAX_IMAGE_FIELD_LENGTH)

    image_file = models.ImageField(
        null=True, max_length=2083, upload_to=profile_image_upload_uri
    )
    image_small_file = models.ImageField(
        null=True, max_length=2083, upload_to=profile_image_upload_uri_small
    )
    image_medium_file = models.ImageField(
        null=True, max_length=2083, upload_to=profile_image_upload_uri_medium
    )

    email_optin = models.NullBooleanField()
    toc_optin = models.NullBooleanField()

    headline = models.CharField(blank=True, null=True, max_length=60)
    bio = models.TextField(blank=True, null=True)
    location = JSONField(null=True, blank=True)

    @transaction.atomic
    def save(
        self, *args, update_image=False, **kwargs
    ):  # pylint: disable=arguments-differ
        """Update thumbnails if necessary"""
        if update_image:
            if self.image_file:
                small_thumbnail = make_thumbnail(
                    self.image_file, IMAGE_SMALL_MAX_DIMENSION
                )
                medium_thumbnail = make_thumbnail(
                    self.image_file, IMAGE_MEDIUM_MAX_DIMENSION
                )

                # name doesn't matter here, we use upload_to to produce that
                self.image_small_file.save(
                    "{}.jpg".format(uuid4().hex), small_thumbnail
                )
                self.image_medium_file.save(
                    "{}.jpg".format(uuid4().hex), medium_thumbnail
                )
            else:
                self.image_small_file = None
                self.image_medium_file = None
        super(Profile, self).save(  # pylint:disable=super-with-arguments
            *args, **kwargs
        )

    def __str__(self):
        return "{}".format(self.name)


class UserWebsite(models.Model):
    """A model for storing information for websites that should appear in a user's profile"""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    url = models.CharField(max_length=200)
    site_type = models.CharField(
        max_length=15,
        choices=zip(sorted(SITE_TYPE_OPTIONS), sorted(SITE_TYPE_OPTIONS)),
        default=PERSONAL_SITE_TYPE,
    )

    class Meta:
        unique_together = ("profile", "site_type")

    def __str__(self):
        return "url: {}; site_type: {}".format(self.url, self.site_type)
