"""Channels models"""
import base36
from django.conf import settings
from django.db import models
from django.db.models import URLField

from open_discussions.models import TimestampedModel


class Base36IntegerField(models.BigIntegerField):
    """Handles a Reddit base36 encoded string id which is stored as a base10 integer"""

    def get_prep_value(self, value):
        """Converts from base36 to base10 for the DB"""
        if value is not None:
            return base36.loads(value)
        return value

    def from_db_value(self, value, expression, connection, context):  # pylint: disable=unused-argument
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
        return cls.objects.filter(user=user, token_expires_at__gt=threshold_date).order_by('-token_expires_at')

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
        return "{} is subscribed to post_id: {}, comment_id: {}".format(self.user, self.post_id, self.comment_id)

    class Meta:
        unique_together = (('user', 'post_id', 'comment_id'),)
        index_together = (('post_id', 'comment_id'),)


class Channel(TimestampedModel):
    """
    Keep track of channels which are stored in reddit
    """
    name = models.CharField(unique=True, max_length=100)
    membership_is_managed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name}"


class LinkMeta(TimestampedModel):
    """
    The thumbnail embedly provides for a particular URL
    """
    url = URLField(unique=True, max_length=2048)
    thumbnail = URLField(blank=True, null=True, max_length=2048)


class Post(TimestampedModel):
    """
    Keep track of post ids so that we can index all posts
    """
    channel = models.ForeignKey(Channel)
    post_id = Base36IntegerField(unique=True)
    link_meta = models.ForeignKey(LinkMeta, null=True)

    def __str__(self):
        return f"{self.post_id} on channel {self.channel}"


class Comment(TimestampedModel):
    """
    Keep track of comment ids so that we can index all comments efficiently
    """
    post = models.ForeignKey(Post)
    comment_id = Base36IntegerField(unique=True)
    parent_id = Base36IntegerField(null=True)

    def __str__(self):
        return f"{self.comment_id} on post {self.post}"
