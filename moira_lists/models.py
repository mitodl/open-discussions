"""Models for moira lists"""
from django.contrib.auth.models import User
from django.db import models

from open_discussions.models import TimestampedModel


class MoiraList(TimestampedModel):
    """Moira list"""

    name = models.CharField(max_length=250, unique=True, primary_key=True)
    users = models.ManyToManyField(User, related_name="moira_lists")

    def __str__(self):
        return self.name

    def __repr__(self):
        return f"<MoiraList: {self.name!r}>"
