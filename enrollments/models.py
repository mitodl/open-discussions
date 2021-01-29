"""
enrollemnets models
"""
from django.db import models
from django.conf import settings
from open_discussions.models import TimestampedModel
from course_catalog.models import LearningResourceRun


class Enrollment(TimestampedModel):
    """Data model for enrollments"""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments"
    )
    run = models.ForeignKey(
        LearningResourceRun, on_delete=models.CASCADE, related_name="enrollments"
    )
    enrollment_date = models.DateTimeField()

    def __str__(self):
        return f"Enrollment user_id={self.user_id} run_id={self.run_id}"

    class Meta:
        unique_together = (("user", "run"),)
