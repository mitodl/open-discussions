"""
course_catalog models
"""
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.contrib.postgres.fields import JSONField

from course_catalog.constants import ResourceType
from course_catalog.utils import program_image_upload_uri, user_list_image_upload_uri
from open_discussions.models import TimestampedModel


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


class LearningResource(TimestampedModel):
    """
    Base class for all learning resource models under course_catalog app.
    """

    title = models.CharField(max_length=256)
    short_description = models.TextField(null=True, blank=True)
    topics = models.ManyToManyField(CourseTopic, blank=True)
    offered_by = models.CharField(max_length=128, null=True, blank=True)

    class Meta:
        abstract = True


class AbstractCourse(LearningResource):
    """
    Abstract data model for course models
    """

    year = models.IntegerField(null=True, blank=True)
    full_description = models.TextField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    enrollment_start = models.DateTimeField(null=True, blank=True)
    enrollment_end = models.DateTimeField(null=True, blank=True)
    image_src = models.URLField(max_length=400, null=True, blank=True)
    image_description = models.CharField(max_length=1024, null=True, blank=True)
    last_modified = models.DateTimeField(null=True, blank=True)

    language = models.CharField(max_length=128, null=True, blank=True)
    featured = models.BooleanField(default=False)
    published = models.BooleanField(default=True)
    availability = models.CharField(max_length=128, null=True, blank=True)
    url = models.URLField(null=True, max_length=2048)

    learning_resource_type = models.CharField(
        max_length=20, default=ResourceType.course.value
    )

    class Meta:
        abstract = True


class Course(AbstractCourse):
    """
    Course model for courses on all platforms
    """

    course_id = models.CharField(max_length=128, unique=True)

    level = models.CharField(max_length=128, null=True, blank=True)
    semester = models.CharField(max_length=20, null=True, blank=True)
    platform = models.CharField(max_length=128)

    raw_json = JSONField(null=True, blank=True)

    program_type = models.CharField(max_length=32, null=True, blank=True)
    program_name = models.CharField(max_length=256, null=True, blank=True)

    instructors = models.ManyToManyField(
        CourseInstructor, blank=True, related_name="courses"
    )
    prices = models.ManyToManyField(CoursePrice, blank=True)


class CourseRun(AbstractCourse):
    """
    Model for course runs
    """

    course_run_id = models.CharField(max_length=128, unique=True)

    level = models.CharField(max_length=128, null=True, blank=True)
    semester = models.CharField(max_length=20, null=True, blank=True)

    instructors = models.ManyToManyField(
        CourseInstructor, blank=True, related_name="course_runs"
    )
    prices = models.ManyToManyField(CoursePrice, blank=True)
    course = models.ForeignKey(
        Course, related_name="course_runs", on_delete=models.CASCADE
    )


class Bootcamp(AbstractCourse):
    """
    Bootcamp model for bootcamps. Being course-like, it shares a large overlap with Course model.
    """

    course_id = models.CharField(max_length=128, unique=True)

    instructors = models.ManyToManyField(
        CourseInstructor, blank=True, related_name="bootcamps"
    )
    prices = models.ManyToManyField(CoursePrice, blank=True)
    location = models.CharField(max_length=128, null=True, blank=True)


class List(LearningResource):
    """
    List model tracks an ordered list of other LearningResources.
    """

    image_description = models.CharField(max_length=1024, null=True, blank=True)

    class Meta:
        abstract = True


class ListItem(TimestampedModel):
    """
    ListItem model tracks associated metadata and LearningResource.
    `content_type` is restricted to the learning resources we want.
    Lists should not contain other Lists such as Programs and UserLists (such as learning paths).
    """

    position = models.PositiveIntegerField()
    content_type = models.ForeignKey(
        ContentType,
        limit_choices_to={"model__in": ("Course", "Bootcamp")},
        on_delete=models.CASCADE,
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey("content_type", "object_id")

    class Meta:
        abstract = True


class UserList(List):
    """
    UserList is a user-created model tracking a restricted list of LearningResources.
    """

    author = models.ForeignKey(User, on_delete=models.PROTECT)
    privacy_level = models.CharField(max_length=32, null=True, blank=True)
    image_src = models.ImageField(
        null=True, max_length=2083, upload_to=user_list_image_upload_uri
    )
    list_type = models.CharField(max_length=128)


class UserListItem(ListItem):
    """
    ListItem model for UserLists
    """

    user_list = models.ForeignKey(
        UserList, related_name="items", on_delete=models.CASCADE
    )


class Program(List):
    """
    Program model for MIT programs. Consists of specified list of LearningResources.
    """

    image_src = models.ImageField(
        null=True, max_length=2083, upload_to=program_image_upload_uri
    )


class ProgramItem(ListItem):
    """
    ListItem model for Programs
    """

    program = models.ForeignKey(Program, related_name="items", on_delete=models.CASCADE)


class FavoriteItem(TimestampedModel):
    """
    FavoriteItem model tracks LearningResources that are marked by user as their favorite.
    Favorites don't need to track an user-specified order, although they can by
    default be displayed ordered by timestamp. Users should be able to favorite any
    LearningResource, including Lists like Programs and UserLists.
    """

    user = models.ForeignKey(User, on_delete=models.PROTECT)
    content_type = models.ForeignKey(
        ContentType,
        limit_choices_to={"model__in": ("Course", "Bootcamp", "UserList", "Program")},
        on_delete=models.CASCADE,
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey("content_type", "object_id")

    class Meta:
        unique_together = ("user", "content_type", "object_id")
