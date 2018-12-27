"""Channels models"""
from uuid import uuid4

import base36
from bitfield import BitField
from django.conf import settings
from django.contrib.auth.models import User, Group
from django.contrib.postgres.fields import JSONField
from django.db import models
from widgets.models import WidgetList


from channels.constants import ROLE_CHOICES, VALID_EXTENDED_POST_CHOICES
from channels.utils import (
    AVATAR_MEDIUM_MAX_DIMENSION,
    AVATAR_SMALL_MAX_DIMENSION,
    THUMBNAIL_DIMENSIONS,
)
from open_discussions.models import TimestampedModel
from profiles.utils import (
    avatar_uri,
    avatar_uri_small,
    avatar_uri_medium,
    banner_uri,
    make_thumbnail,
    article_image_uri,
    article_image_uri_small,
    make_cropped_thumbnail,
)


class Base36IntegerField(models.BigIntegerField):
    """Handles a Reddit base36 encoded string id which is stored as a base10 integer"""

    def get_prep_value(self, value):
        """Converts from base36 to base10 for the DB"""
        if value is not None:
            return base36.loads(value)
        return value

    def from_db_value(
        self, value, expression, connection
    ):  # pylint: disable=unused-argument
        """Converts from base10 to base36 for application"""
        if value is None:
            return value
        return base36.dumps(value)

    def to_python(self, value):
        """Converts from base10 to base36 for application"""
        if not value:
            return value

        return base36.dumps(value)


class RedditRefreshToken(models.Model):
    """
    Tracks the refresh token for a given user
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    token_value = models.CharField(null=True, max_length=255)

    def __str__(self):
        return "{}".format(self.token_value)


class RedditAccessToken(models.Model):
    """
    Tracks the access tokens for a given user

    We generate a new one whenever the latest one expires and then clean up stale ones in a cron
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    token_value = models.CharField(null=True, max_length=255)
    token_expires_at = models.DateTimeField(null=True)

    @classmethod
    def valid_tokens_for_user(cls, user, threshold_date):
        """
        Returns a QuerySet for valid tokens for the user and threshold_date

        Args:
            user (User): the user to find tokens for
            threshold_date (datetime): the date before which the tokens should still be valid

        Returns:
            QuerySet: query set filtered to nonexpired tokens sorted by most recent first
        """
        return cls.objects.filter(
            user=user, token_expires_at__gt=threshold_date
        ).order_by("-token_expires_at")

    def __str__(self):
        return "{} expires: {}".format(self.token_value, self.token_expires_at)


class Subscription(TimestampedModel):
    """
    Tracks user subscriptions to a post or a comment
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    post_id = Base36IntegerField()
    comment_id = Base36IntegerField(null=True)

    def __str__(self):
        """Prints the subscription as a str"""
        return "{} is subscribed to post_id: {}, comment_id: {}".format(
            self.user, self.post_id, self.comment_id
        )

    class Meta:
        unique_together = (("user", "post_id", "comment_id"),)
        index_together = (("post_id", "comment_id"),)


class Channel(TimestampedModel):
    """
    Keep track of channels which are stored in reddit
    """

    name = models.CharField(unique=True, max_length=100)
    membership_is_managed = models.BooleanField(default=False)
    avatar = models.ImageField(null=True, max_length=2083, upload_to=avatar_uri)
    avatar_small = models.ImageField(
        null=True, max_length=2083, upload_to=avatar_uri_small
    )
    avatar_medium = models.ImageField(
        null=True, max_length=2083, upload_to=avatar_uri_medium
    )
    banner = models.ImageField(null=True, max_length=2083, upload_to=banner_uri)
    ga_tracking_id = models.CharField(max_length=24, blank=True, null=True)
    widget_list = models.ForeignKey(WidgetList, on_delete=models.SET_NULL, null=True)

    # Bitfield mutates the list passed to
    allowed_post_types = BitField(flags=VALID_EXTENDED_POST_CHOICES, null=True)

    def save(
        self, *args, update_image=False, **kwargs
    ):  # pylint: disable=arguments-differ
        if update_image:
            if self.avatar:
                small_thumbnail = make_thumbnail(
                    self.avatar, AVATAR_SMALL_MAX_DIMENSION
                )
                medium_thumbnail = make_thumbnail(
                    self.avatar, AVATAR_MEDIUM_MAX_DIMENSION
                )

                # name doesn't matter here, we use upload_to to produce that
                self.avatar_small.save(f"{uuid4().hex}.jpg", small_thumbnail)
                self.avatar_medium.save(f"{uuid4().hex}.jpg", medium_thumbnail)
            else:
                self.avatar_small = None
                self.avatar_medium = None

        return super().save(*args, **kwargs)

    @property
    def subscribers(self):
        """
        Retrieve channel subscribers

        Returns:
            iterable of User: users who are channel subscribers

        """
        return User.objects.filter(
            id__in=ChannelSubscription.objects.filter(channel=self)
            .order_by("created_on")
            .values_list("user", flat=True)
        ).iterator()

    def __str__(self):
        return f"{self.name}"


class LinkMeta(TimestampedModel):
    """
    The thumbnail embedly provides for a particular URL
    """

    url = models.URLField(unique=True, max_length=2048)
    thumbnail = models.URLField(blank=True, null=True, max_length=2048)

    def __str__(self):
        return f"{self.url} with thumbnail {self.thumbnail}"


class Post(TimestampedModel):
    """
    Keep track of post ids so that we can index all posts
    """

    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    post_id = Base36IntegerField(unique=True)
    link_meta = models.ForeignKey(LinkMeta, null=True, on_delete=models.CASCADE)
    post_type = models.CharField(
        max_length=10, choices=VALID_EXTENDED_POST_CHOICES, null=True
    )

    def __str__(self):
        return f"{self.post_id} on channel {self.channel}"


class Article(TimestampedModel):
    """Data for an article post_type"""

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    post = models.OneToOneField(Post, on_delete=models.CASCADE)
    cover_image = models.ImageField(
        null=True, blank=True, max_length=2083, upload_to=article_image_uri
    )
    cover_image_small = models.ImageField(
        null=True, blank=True, max_length=2083, upload_to=article_image_uri_small
    )
    content = JSONField()

    def save(
        self, *args, update_image=False, **kwargs
    ):  # pylint: disable=arguments-differ
        if update_image:
            if self.cover_image:
                small_thumbnail = make_cropped_thumbnail(
                    self.cover_image, THUMBNAIL_DIMENSIONS.x, THUMBNAIL_DIMENSIONS.y
                )

                # name doesn't matter here, we use upload_to to produce that
                self.cover_image_small.save(f"{uuid4().hex}.jpg", small_thumbnail)
            else:
                self.cover_image_small = None

        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.post.id} on channel {self.post.channel} by {self.author.profile.name}"


class Comment(TimestampedModel):
    """
    Keep track of comment ids so that we can index all comments efficiently
    """

    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    comment_id = Base36IntegerField(unique=True)
    parent_id = Base36IntegerField(null=True)

    def __str__(self):
        return f"{self.comment_id} on post {self.post}"


class ChannelSubscription(TimestampedModel):
    """
    Keep track of channel subscribers
    """

    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("user", "channel"),)

    def __str__(self):
        return f"User {self.user.username} subscription for Channel {self.channel.name}"


class ChannelGroupRole(TimestampedModel):
    """
    Keep track of channel moderators and contributors
    """

    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    role = models.CharField(max_length=48, choices=zip(ROLE_CHOICES, ROLE_CHOICES))

    class Meta:
        unique_together = (("channel", "group", "role"),)
        index_together = (("channel", "role"),)

    def __str__(self):
        return (
            f"Group {self.group.name} role {self.role} for Channel {self.channel.name}"
        )
