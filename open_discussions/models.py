"""
Classes related to models for open_discussions
"""
from django.db.models import DateTimeField, Model
from django.db.models.query import QuerySet

from open_discussions.utils import now_in_utc


class TimestampedModelQuerySet(QuerySet):
    """
    Subclassed QuerySet for TimestampedModelManager
    """

    def update(self, **kwargs):
        """
        Automatically update updated_on timestamp when .update(). This is because .update()
        does not go through .save(), thus will not auto_now, because it happens on the
        database level without loading objects into memory.
        """
        if "updated_on" not in kwargs:
            kwargs["updated_on"] = now_in_utc()
        return super().update(**kwargs)


class TimestampedModel(Model):
    """
    Base model for create/update timestamps
    """

    objects = TimestampedModelQuerySet.as_manager()
    created_on = DateTimeField(auto_now_add=True)  # UTC
    updated_on = DateTimeField(auto_now=True)  # UTC

    class Meta:
        abstract = True


class NoDefaultTimestampedModel(TimestampedModel):
    """
    This model is an alternative for TimestampedModel with one
    important difference: it doesn't specify `auto_now` and `auto_now_add`.
    This allows us to pass in our own values without django overriding them.
    You'd typically use this model when backpopulating data from a source that
    already has values for these fields and then switch to TimestampedModel
    after existing data has been backpopulated.
    """

    created_on = DateTimeField(default=now_in_utc)
    updated_on = DateTimeField(default=now_in_utc)

    class Meta:
        abstract = True
