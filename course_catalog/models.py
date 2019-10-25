"""
course_catalog models
"""
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.contrib.postgres.fields import JSONField

from course_catalog.constants import ResourceType, PrivacyLevel
from course_catalog.utils import user_list_image_upload_uri
from open_discussions.models import TimestampedModel


class CourseInstructor(TimestampedModel):
    """
    Instructors for all courses
    """

    first_name = models.CharField(max_length=128, null=True, blank=True)
    last_name = models.CharField(max_length=128, null=True, blank=True)
    full_name = models.CharField(max_length=256, null=True, blank=True)

    def __str__(self):
        return self.full_name or " ".join((self.first_name, self.last_name))


class CourseTopic(TimestampedModel):
    """
    Topics for all courses (e.g. "History")
    """

    name = models.CharField(max_length=128, unique=True)

    def __str__(self):
        return self.name


class CoursePrice(TimestampedModel):
    """
    Price model for all courses (e.g. "price": 0.00, "mode": "audit")
    """

    price = models.DecimalField(decimal_places=2, max_digits=6)
    mode = models.CharField(max_length=128)
    upgrade_deadline = models.DateTimeField(null=True)

    def __str__(self):
        return "${:,.2f}".format(self.price)


class LearningResourceOfferor(TimestampedModel):
    """Data model for who is offering a learning resource"""

    name = models.CharField(max_length=32, unique=True)


class LearningResource(TimestampedModel):
    """
    Base class for all learning resource models under course_catalog app.
    """

    title = models.CharField(max_length=256)
    short_description = models.TextField(null=True, blank=True)
    topics = models.ManyToManyField(CourseTopic, blank=True)

    # deprecated, moved aside to _offered_by, but still mapped to the old column so we don't drop it immediately
    _deprecated_offered_by = models.CharField(
        db_column="offered_by", max_length=128, null=True, blank=True
    )

    offered_by = models.ManyToManyField(LearningResourceOfferor, blank=True)

    class Meta:
        abstract = True


class AbstractCourse(LearningResource):
    """
    Abstract data model for course models
    """

    full_description = models.TextField(null=True, blank=True)
    image_src = models.URLField(max_length=400, null=True, blank=True)
    image_description = models.CharField(max_length=1024, null=True, blank=True)
    last_modified = models.DateTimeField(null=True, blank=True)

    featured = models.BooleanField(default=False)
    published = models.BooleanField(default=True)

    url = models.URLField(null=True, max_length=2048)

    learning_resource_type = models.CharField(
        max_length=20, default=ResourceType.course.value
    )

    class Meta:
        abstract = True


class LearningResourceRun(AbstractCourse):
    """
    Model for course runs
    """

    run_id = models.CharField(max_length=128)
    platform = models.CharField(max_length=128, null=True)

    year = models.IntegerField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    enrollment_start = models.DateTimeField(null=True, blank=True)
    enrollment_end = models.DateTimeField(null=True, blank=True)
    best_start_date = models.DateTimeField(null=True, blank=True)
    best_end_date = models.DateTimeField(null=True, blank=True)
    level = models.CharField(max_length=128, null=True, blank=True)
    semester = models.CharField(max_length=20, null=True, blank=True)
    availability = models.CharField(max_length=128, null=True, blank=True)
    language = models.CharField(max_length=128, null=True, blank=True)

    instructors = models.ManyToManyField(
        CourseInstructor, blank=True, related_name="course_instructors"
    )
    prices = models.ManyToManyField(CoursePrice, blank=True)
    course = models.ForeignKey(
        "Course",
        null=True,
        blank=True,
        related_name="deprecated_runs",
        on_delete=models.CASCADE,
    )

    content_type = models.ForeignKey(
        ContentType,
        null=True,
        limit_choices_to={"model__in": ("course", "bootcamp", "program")},
        on_delete=models.CASCADE,
    )
    object_id = models.PositiveIntegerField(null=True)
    content_object = GenericForeignKey("content_type", "object_id")

    def __str__(self):
        return f"LearningResourceRun platform={self.platform} run_id={self.run_id}"


class Course(AbstractCourse):
    """
    Course model for courses on all platforms
    """

    course_id = models.CharField(max_length=128)
    platform = models.CharField(max_length=128)

    raw_json = JSONField(null=True, blank=True)

    program_type = models.CharField(max_length=32, null=True, blank=True)
    program_name = models.CharField(max_length=256, null=True, blank=True)

    runs = GenericRelation(LearningResourceRun)


class Bootcamp(AbstractCourse):
    """
    Bootcamp model for bootcamps. Being course-like, it shares a large overlap with Course model.
    """

    course_id = models.CharField(max_length=128, unique=True)

    location = models.CharField(max_length=128, null=True, blank=True)
    runs = GenericRelation(LearningResourceRun)


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
        limit_choices_to={"model__in": ("course", "bootcamp")},
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
    privacy_level = models.CharField(max_length=32, default=PrivacyLevel.private.value)
    image_src = models.ImageField(
        null=True, blank=True, max_length=2083, upload_to=user_list_image_upload_uri
    )
    list_type = models.CharField(max_length=128)

    class Meta:
        verbose_name = "user_list"


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

    program_id = models.CharField(max_length=80, null=True)
    image_src = models.URLField(max_length=2048, null=True, blank=True)
    url = models.URLField(null=True, max_length=2048)
    published = models.BooleanField(default=True)
    runs = GenericRelation(LearningResourceRun)


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
        limit_choices_to={"model__in": ("course", "bootcamp", "userlist", "program")},
        on_delete=models.CASCADE,
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey("content_type", "object_id")

    class Meta:
        unique_together = ("user", "content_type", "object_id")


class VideoResource(LearningResource):
    """Data model for video resources"""

    video_id = models.CharField(max_length=80)
    platform = models.CharField(max_length=128)

    full_description = models.TextField(null=True, blank=True)
    image_src = models.URLField(max_length=400, null=True, blank=True)
    last_modified = models.DateTimeField(null=True, blank=True)

    published = models.BooleanField(default=True)

    url = models.URLField(null=True, max_length=2048)

    transcript = models.TextField(blank=True, default="")

    raw_data = models.TextField(blank=True, default="")

    class Meta:
        unique_together = ("platform", "video_id")
