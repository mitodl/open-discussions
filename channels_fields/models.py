"""Models for channels_fields"""
from django.contrib.auth.models import Group
from django.db import models
from django.db.models import deletion

from channels_fields.constants import FIELD_ROLE_CHOICES
from course_catalog.models import UserList
from discussions.models import BaseChannel
from open_discussions.models import TimestampedModel
from widgets.models import WidgetList


class FieldChannel(BaseChannel, TimestampedModel):
    """Field of study"""

    featured_list = models.ForeignKey(
        UserList, null=True, blank=True, on_delete=deletion.SET_NULL
    )

    widget_list = models.ForeignKey(
        WidgetList,
        on_delete=models.SET_NULL,
        null=True,
        related_name="field_channel",
    )


class FieldList(TimestampedModel):
    """UserList and position (list order) for a field channel"""

    field_list = models.ForeignKey(UserList, on_delete=models.CASCADE)
    field_channel = models.ForeignKey(
        FieldChannel, related_name="lists", on_delete=models.CASCADE
    )
    position = models.IntegerField(default=0)

    class Meta:
        unique_together = (("field_list", "field_channel"),)


class Subfield(TimestampedModel):
    """Subfield and position for a parent field channel"""

    field_channel = models.ForeignKey(FieldChannel, on_delete=models.CASCADE)
    parent_channel = models.ForeignKey(
        FieldChannel, on_delete=models.CASCADE, related_name="subfields"
    )
    position = models.IntegerField(default=0)

    class Meta:
        unique_together = (("field_channel", "parent_channel"),)


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
