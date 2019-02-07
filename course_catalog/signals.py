"""
course_catalog signals
"""
import logging

from django.db.models.signals import post_delete
from django.dispatch import receiver

from course_catalog.models import Course
from search.task_helpers import delete_course

log = logging.getLogger(__name__)


@receiver(post_delete, sender=Course, dispatch_uid="delete_course_from_index")
def delete_course_from_index(
    sender, instance, **kwargs
):  # pylint:disable=unused-argument
    """
    Delete from the ES index
    """
    delete_course(instance)
