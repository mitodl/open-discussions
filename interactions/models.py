"""Interactions models"""
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from open_discussions.utils import now_in_utc


class ContentTypeInteraction(models.Model):
    """Model tracking user interactions with learning resources"""

    interaction_type = models.CharField(max_length=30)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    content_id = models.PositiveIntegerField()
    content = GenericForeignKey("content_type", "content_id")

    # NOTE: TimestampedModel doesn't make sense here because these records will never be updated
    #       (or at least, the fact that they're updated wouldn't be significant)
    #       This also uses `default` instead of `auto_now_add` as an allowance for specifying the timestamp
    recorded_on = models.DateTimeField(default=now_in_utc)
