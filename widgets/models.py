"""WidgetApp models"""
from django.db import models
from django.db.models import JSONField


class WidgetList(models.Model):
    """WidgetList handles authentication and is linked to a set of WidgetInstances"""

    class Meta:
        app_label = "widgets"


class WidgetInstance(models.Model):
    """WidgetInstance contains data for a single widget instance, regardless of what class of widget it is"""

    widget_list = models.ForeignKey(
        WidgetList, related_name="widgets", on_delete=models.CASCADE
    )
    widget_type = models.CharField(max_length=200)
    configuration = JSONField()
    position = models.PositiveIntegerField()
    title = models.CharField(max_length=200)

    class Meta:
        app_label = "widgets"
        indexes = [
            # NOTE: this is effectively unique_together, but we enforce this in code, not in the DB
            models.Index(
                fields=["widget_list", "position"], name="widget_list_position_index"
            )
        ]
        ordering = ["position"]
