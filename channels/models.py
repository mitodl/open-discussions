"""Channels models"""
from django.conf import settings
from django.db import models


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
