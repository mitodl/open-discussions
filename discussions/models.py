"""Discussions models"""
from bitfield import BitField
from django.contrib.auth.models import Group
from django.contrib.postgres.fields import JSONField
from django.core.validators import RegexValidator
from django.db import models
from imagekit.models import ImageSpecField, ProcessedImageField
from imagekit.processors import ResizeToFit

from channels.utils import AVATAR_MEDIUM_MAX_DIMENSION, AVATAR_SMALL_MAX_DIMENSION
from discussions.constants import ChannelTypes, PostTypes
from open_discussions.models import NoDefaultTimestampedModel, TimestampedModelQuerySet
from profiles.utils import avatar_uri, banner_uri
from widgets.models import WidgetList


class ChannelQuerySet(TimestampedModelQuerySet):
    """Custom queryset for user"""

    def filter_for_user(self, user):
        """Filter the queryset for what a given user is allowed to operate on"""
        from guardian.shortcuts import get_objects_for_user

        permission = "{app_label}.view_{model_name}".format(
            app_label=self.model._meta.app_label, model_name=self.model._meta.model_name
        )

        if user.is_staff:
            # staff users can see/do anything
            return self

        # any user should be able to see these
        qs = self.filter(channel_type__in=ChannelTypes.readable_by_any_user())

        if user.is_authenticated:
            # if the user is additionally authenticated, we include private channels the user has permissions to view
            qs |= get_objects_for_user(
                user, permission, self, accept_global_perms=False
            )

        return qs


class Channel(NoDefaultTimestampedModel):
    """Data model for channels"""

    objects = ChannelQuerySet.as_manager()

    # Channel configuration
    name = models.CharField(
        max_length=100,
        validators=[
            RegexValidator(
                regex=r"^[A-Za-z0-9_]+$",
                message="Channel name can only contain the characters: A-Z, a-z, 0-9, _",
            )
        ],
    )
    title = models.CharField(max_length=100)
    public_description = models.CharField(max_length=80, default="")

    moderator_group = models.ForeignKey(
        Group, on_delete=models.PROTECT, related_name="moderators_of"
    )
    contributor_group = models.ForeignKey(
        Group, on_delete=models.PROTECT, related_name="contributors_of"
    )
    membership_is_managed = models.BooleanField(default=False)

    allowed_post_types = BitField(flags=PostTypes.choices())
    channel_type = models.CharField(max_length=20, choices=ChannelTypes.choices())

    # Branding fields
    avatar = ProcessedImageField(null=True, max_length=2083, upload_to=avatar_uri)
    avatar_small = ImageSpecField(
        source="avatar",
        processors=[
            ResizeToFit(
                height=AVATAR_SMALL_MAX_DIMENSION,
                width=AVATAR_SMALL_MAX_DIMENSION,
                upscale=False,
            )
        ],
    )
    avatar_medium = ImageSpecField(
        source="avatar",
        processors=[
            ResizeToFit(
                height=AVATAR_MEDIUM_MAX_DIMENSION,
                width=AVATAR_MEDIUM_MAX_DIMENSION,
                upscale=False,
            )
        ],
    )
    banner = ProcessedImageField(null=True, max_length=2083, upload_to=banner_uri)
    about = JSONField(blank=True, null=True)

    # Miscellaneous fields
    widget_list = models.ForeignKey(
        WidgetList,
        on_delete=models.SET_NULL,
        null=True,
        related_name="discussions_channel",
    )
    ga_tracking_id = models.CharField(max_length=24, blank=True, null=True)

    def __str__(self):
        """str representation of channel"""
        return self.title

    @property
    def moderators(self):
        """
        Get a list of moderators

        Returns:
            list of User: list of contributor users
        """
        return self.moderator_group.user_set.all()

    @property
    def contributors(self):
        """
        Get a list of contributors

        Returns:
            list of User: list of contributor users
        """
        return self.contributor_group.user_set.all()

    @property
    def is_public(self):
        """Returns True if the channel is public"""
        return self.channel_type == ChannelTypes.PUBLIC.value

    @property
    def is_private(self):
        """Returns True if the channel is private"""
        return self.channel_type == ChannelTypes.PRIVATE.value

    @property
    def is_restricted(self):
        """Returns True if the channel is restricted"""
        return self.channel_type == ChannelTypes.RESTRICTED.value

    @property
    def is_readable_by_any_user(self):
        """Returns True if the channel can be read by anyone"""
        return self.channel_type in ChannelTypes.readable_by_any_user()

    class Meta:
        ordering = ("id",)
