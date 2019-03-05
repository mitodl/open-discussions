"""
course_catalog models
"""
from django.db import models
from django.contrib.postgres.fields import JSONField
from course_catalog.constants import ResourceType


class TimestampedModel(models.Model):
    """
    Parent class for all models under course_catalog app.
    It provides created_on and last_updated timestamps automatically.
    """

    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CourseInstructor(TimestampedModel):
    """
    Instructors for all courses
    """

    first_name = models.CharField(max_length=128)
    last_name = models.CharField(max_length=128)


class CourseTopic(TimestampedModel):
    """
    Topics for all courses (e.g. "History")
    """

    name = models.CharField(max_length=128, unique=True)


class CoursePrice(TimestampedModel):
    """
    Price model for all courses (e.g. "price": 0.00, "mode": "audit")
    """

    price = models.DecimalField(decimal_places=2, max_digits=6)
    mode = models.CharField(max_length=128)
    upgrade_deadline = models.DateTimeField(null=True)


class Course(TimestampedModel):
    """
    Course model for courses on all platforms
    """

    course_id = models.CharField(max_length=128, unique=True)
    title = models.CharField(max_length=256)
    short_description = models.TextField(null=True, blank=True)
    level = models.CharField(max_length=128, null=True, blank=True)
    semester = models.CharField(max_length=20, null=True, blank=True)
    language = models.CharField(max_length=128, null=True, blank=True)
    platform = models.CharField(max_length=128)
    year = models.IntegerField(null=True, blank=True)
    full_description = models.TextField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    enrollment_start = models.DateTimeField(null=True, blank=True)
    enrollment_end = models.DateTimeField(null=True, blank=True)
    image_src = models.URLField(max_length=400, null=True, blank=True)
    image_description = models.CharField(max_length=1024, null=True, blank=True)
    last_modified = models.DateTimeField(null=True, blank=True)
    raw_json = JSONField(null=True, blank=True)
    featured = models.BooleanField(default=False)
    published = models.BooleanField(default=True)
    availability = models.CharField(max_length=128, null=True, blank=True)
    url = models.URLField(null=True, max_length=2048)
    instructors = models.ManyToManyField(
        CourseInstructor, blank=True, related_name="courses"
    )
    learning_resource_type = models.CharField(
        max_length=20, default=ResourceType.course.value
    )
    topics = models.ManyToManyField(CourseTopic, blank=True, related_name="courses")
    prices = models.ManyToManyField(CoursePrice, blank=True, related_name="courses")
