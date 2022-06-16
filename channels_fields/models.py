"""Models for channels_fields"""
from django.contrib.auth.models import Group
from django.db import models

from channels.models import BaseChannel
from channels_fields.constants import FIELD_ROLE_CHOICES
from open_discussions.models import TimestampedModel


class FieldChannel(BaseChannel, TimestampedModel):
    """Field of study"""

    # Whatever attributes we decide field channels should have,
    # beyond that shared with discussion Channels, will go here.


class FieldChannelGroupRole(TimestampedModel):
    """
    Keep track of field moderators
    """

    field = models.ForeignKey(FieldChannel, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    role = models.CharField(
        max_length=48, choices=zip(FIELD_ROLE_CHOICES, FIELD_ROLE_CHOICES)
    )

    class Meta:
        unique_together = (("field", "group", "role"),)
        index_together = (("field", "role"),)

    def __str__(self):
        return f"Group {self.group.name} role {self.role} for FieldChannel {self.field.name}"
