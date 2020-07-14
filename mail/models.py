""" Models for mail app """
from django.db import models

from open_discussions.models import TimestampedModel


class BlockedEmailRegex(TimestampedModel):
    """
    An object indicating emails to block based on a matching regex string
    """

    match = models.CharField(max_length=256, null=False, blank=False)
