"""Models for field_channels"""
from django.db import models
from django.contrib.postgres.fields import JSONField
from django.db.models import deletion

from channels.models import BaseChannel
from course_catalog.models import UserList
from open_discussions.models import TimestampedModel


class FieldChannel(BaseChannel, TimestampedModel):
    """Field of study"""
    featured_list = models.ForeignKey(UserList, null=True, blank=True, on_delete=deletion.SET_NULL)


class Subfield(TimestampedModel):
    """Subfield of study"""
    name = models.CharField(blank=False, null=False, max_length=1024, unique=True)
    title = models.CharField(blank=False, null=False, max_length=1024)
    description = JSONField(blank=True, null=True)

    def __str__(self):
        return f"{self.title}"


class FieldSubfield(TimestampedModel):
    """
    Relation and position of a subfield within a field
    """
    field = models.ForeignKey(FieldChannel, related_name='subfields', on_delete=deletion.CASCADE)
    subfield = models.ForeignKey(Subfield, on_delete=deletion.CASCADE)
    position = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.field.title}/{self.subfield.title}"

    class Meta:
        unique_together = (("field", "subfield",),)


class SubfieldList(TimestampedModel):
    """List and position for a UserList within a Subfield"""
    subfield = models.ForeignKey(Subfield, related_name='lists', on_delete=deletion.CASCADE)
    list = models.ForeignKey(UserList, on_delete=deletion.CASCADE)
    position = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.subfield.title}/{self.list.title}"

    class Meta:
        unique_together = (("subfield", "list",),)
