"""
course_catalog models
"""
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import ArrayField, JSONField
from django.db import models
from django.db.models import Exists, ExpressionWrapper, OuterRef, Prefetch, Value

from course_catalog.constants import (
    CONTENT_TYPE_FILE,
    GROUP_STAFF_LISTS_EDITORS,
    OCW_DEPARTMENTS,
    VALID_COURSE_CONTENT_CHOICES,
    AvailabilityType,
    OfferedBy,
    PlatformType,
    PrivacyLevel,
    ResourceType,
)
from course_catalog.utils import staff_list_image_upload_uri, user_list_image_upload_uri
from open_discussions.models import TimestampedModel, TimestampedModelQuerySet

OPEN = "Open Content"
PROFESSIONAL = "Professional Offerings"
CERTIFICATE = "Certificates"

PROFESSIONAL_COURSE_PLATFORMS = [
    PlatformType.xpro.value,
    PlatformType.bootcamps.value,
    PlatformType.csail.value,
    PlatformType.ctl.value,
    PlatformType.mitpe.value,
    PlatformType.scc.value,
    PlatformType.see.value,
]


class LearningResourceQuerySet(TimestampedModelQuerySet):
    """QuerySet for resource models that can be favorited"""

    def prefetch_list_items_for_user(self, user=None):
        """Prefetch list_items based on the current user"""
        if user and user.is_authenticated:
            return self.prefetch_related(
                Prefetch(
                    "list_items",
                    queryset=UserListItem.objects.filter(
                        user_list__author=user
                    ).prefetch_related("content_type"),
                )
            )
        # force list_items to be an empty query for anonymous users
        return self.prefetch_related(
            Prefetch("list_items", queryset=UserListItem.objects.none())
        )

    def prefetch_stafflist_items_for_user(self, user=None):
        """Prefetch stafflist_items based on the current user"""
        if (
            user
            and user.is_authenticated
            and (
                user.is_staff
                or user.is_superuser
                or user.groups.filter(name=GROUP_STAFF_LISTS_EDITORS).first()
                is not None
            )
        ):
            return self.prefetch_related(
                Prefetch(
                    "stafflist_items",
                    queryset=StaffListItem.objects.prefetch_related("content_type"),
                )
            )
        # force stafflist_items to be an empty query for other users
        return self.prefetch_related(
            Prefetch("stafflist_items", queryset=StaffListItem.objects.none())
        )

    def annotate_is_favorite_for_user(self, user=None):
        """Annotate the query with a subquery for is_favorite"""
        return self.annotate(
            is_favorite=ExpressionWrapper(
                Exists(
                    FavoriteItem.objects.filter(
                        content_type=ContentType.objects.get_for_model(self.model),
                        object_id=OuterRef("id"),
                    )
                )
                if user and user.is_authenticated
                else Value(False),
                output_field=models.BooleanField(),
            )
        )


class LearningResourceGenericRelationsMixin(models.Model):
    """
    Model mixin for resource models that are favoriteable

    This is intended to be used only for models that have a
    GenericRelation referenced by FavoriteItem
    """

    favorite_items = GenericRelation("course_catalog.FavoriteItem")
    list_items = GenericRelation("course_catalog.UserListItem")
    stafflist_items = GenericRelation("course_catalog.StaffListItem")

    class Meta:
        abstract = True


class CourseInstructor(TimestampedModel):
    """
    Instructors for all courses
    """

    first_name = models.CharField(max_length=128, null=True, blank=True)
    last_name = models.CharField(max_length=128, null=True, blank=True)
    full_name = models.CharField(max_length=256, null=True, blank=True, unique=True)

    class Meta:
        ordering = ["last_name"]

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

    price = models.DecimalField(decimal_places=2, max_digits=12)
    mode = models.CharField(max_length=128)
    upgrade_deadline = models.DateTimeField(null=True)

    def __str__(self):
        return "${:,.2f}".format(self.price)


class LearningResourceOfferor(TimestampedModel):
    """Data model for who is offering a learning resource"""

    name = models.CharField(max_length=256, unique=True)

    def __str__(self):
        return self.name


class LearningResource(TimestampedModel):
    """
    Base class for all learning resource models under course_catalog app.
    """

    title = models.CharField(max_length=256)
    short_description = models.TextField(null=True, blank=True)
    topics = models.ManyToManyField(CourseTopic, blank=True)

    offered_by = models.ManyToManyField(LearningResourceOfferor, blank=True)

    class Meta:
        abstract = True


class AbstractCourse(LearningResource):
    """
    Abstract data model for course models
    """

    full_description = models.TextField(null=True, blank=True)
    image_src = models.TextField(max_length=2048, null=True, blank=True)
    image_description = models.CharField(max_length=1024, null=True, blank=True)
    last_modified = models.DateTimeField(null=True, blank=True)

    featured = models.BooleanField(default=False)
    published = models.BooleanField(default=True)

    url = models.URLField(null=True, max_length=2048)

    learning_resource_type = models.CharField(
        max_length=20, default=ResourceType.course.value
    )
    raw_json = JSONField(null=True, blank=True)

    class Meta:
        abstract = True

        index_together = (("id", "published"),)


class LearningResourceRun(AbstractCourse):
    """
    Model for course runs
    """

    run_id = models.CharField(max_length=128)
    platform = models.CharField(max_length=128)

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
    slug = models.CharField(max_length=1024, null=True, blank=True)

    instructors = models.ManyToManyField(
        CourseInstructor, blank=True, related_name="runs"
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
    checksum = models.CharField(max_length=32, null=True, blank=True)

    def __str__(self):
        return f"LearningResourceRun platform={self.platform} run_id={self.run_id}"

    class Meta:
        unique_together = (("platform", "run_id"),)
        index_together = (
            (
                "content_type",
                "start_date",
            ),  # index for sorting course runs by start date
            ("content_type", "object_id"),
        )


class ContentFile(TimestampedModel):
    """
    ContentFile model for courserun files
    """

    uid = models.CharField(max_length=36, null=True, blank=True)
    key = models.CharField(max_length=1024, null=True, blank=True)
    run = models.ForeignKey(
        LearningResourceRun, related_name="content_files", on_delete=models.CASCADE
    )
    title = models.CharField(max_length=1024, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    image_src = models.URLField(null=True, blank=True)

    url = models.TextField(null=True, blank=True)
    short_url = models.TextField(null=True, blank=True)
    file_type = models.CharField(max_length=128, null=True, blank=True)
    section = models.CharField(max_length=512, null=True, blank=True)
    section_slug = models.CharField(max_length=512, null=True, blank=True)

    content = models.TextField(null=True, blank=True)
    content_title = models.CharField(max_length=1024, null=True, blank=True)
    content_author = models.CharField(max_length=1024, null=True, blank=True)
    content_language = models.CharField(max_length=24, null=True, blank=True)
    content_type = models.CharField(
        choices=VALID_COURSE_CONTENT_CHOICES, default=CONTENT_TYPE_FILE, max_length=10
    )
    learning_resource_types = ArrayField(
        models.CharField(max_length=256, null=False, blank=False), null=True, blank=True
    )
    published = models.BooleanField(default=True)
    checksum = models.CharField(max_length=32, null=True, blank=True)

    class Meta:
        unique_together = (("key", "run"),)
        verbose_name = "contentfile"


def get_max_length(field):
    """
    Get the max length of a ContentFile field

    Args:
        field (str): the name of the field

    Returns:
        int: the max_length of the field
    """
    return ContentFile._meta.get_field(field).max_length


class Course(AbstractCourse, LearningResourceGenericRelationsMixin):
    """
    Course model for courses on all platforms
    """

    objects = LearningResourceQuerySet.as_manager()

    course_id = models.CharField(max_length=128)
    platform = models.CharField(max_length=128)
    location = models.CharField(max_length=128, null=True, blank=True)

    program_type = models.CharField(max_length=32, null=True, blank=True)
    program_name = models.CharField(max_length=256, null=True, blank=True)
    department = ArrayField(
        models.CharField(max_length=256, null=False, blank=False), null=True, blank=True
    )

    runs = GenericRelation(LearningResourceRun)

    course_feature_tags = JSONField(null=True, blank=True)
    extra_course_numbers = ArrayField(
        models.CharField(max_length=128), null=True, blank=True
    )
    ocw_next_course = models.BooleanField(default=False)

    @property
    def audience(self):
        """Returns the audience for the course"""
        if self.platform in PROFESSIONAL_COURSE_PLATFORMS:
            return [PROFESSIONAL]
        else:
            return [OPEN]

    @property
    def certification(self):
        """Returns the certification for the course"""
        if self.platform in PROFESSIONAL_COURSE_PLATFORMS or (
            self.platform == PlatformType.mitx.value
            and any(
                availability != AvailabilityType.archived.value
                for availability in self.runs.values_list("availability", flat=True)
            )
        ):
            return [CERTIFICATE]
        else:
            return []

    @property
    def department_name(self):
        """Returns the names of the departments"""
        names = list(
            map(
                lambda department_num: OCW_DEPARTMENTS.get(department_num, {}).get(
                    "name"
                ),
                self.department or [],
            )
        )

        return [name for name in names if name]

    @property
    def department_slug(self):
        """Returns the department slug"""
        if self.department:
            first_department = self.department[0]
        else:
            first_department = None
        return OCW_DEPARTMENTS.get(first_department, {}).get("slug")

    @property
    def coursenum(self):
        """Returns the course number from the course_id"""
        return self.course_id.split("+")[-1]  # pylint:disable=use-maxsplit-arg

    def __str__(self):
        return self.title

    class Meta:
        unique_together = ("platform", "course_id")


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
        limit_choices_to={"model__in": ("course",)},
        on_delete=models.CASCADE,
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey("content_type", "object_id")

    class Meta:
        abstract = True


class LearningList(List, LearningResourceGenericRelationsMixin):
    """
    Abstract class and base for user lists and staff lists
    """

    objects = LearningResourceQuerySet.as_manager()

    author = models.ForeignKey(User, on_delete=models.PROTECT)
    privacy_level = models.CharField(max_length=32, default=PrivacyLevel.private.value)
    list_type = models.CharField(max_length=128)

    @property
    def audience(self):
        """Returns the audience for the user list"""
        for list_item in self.items.all():
            if OPEN not in list_item.item.audience:
                return []

        return [OPEN]

    @property
    def certification(self):
        """Returns the certification for the user list"""
        return []

    def __str__(self):
        return f"{self.title}"

    class Meta:
        abstract = True


class UserList(LearningList):
    """
    UserList is a user-created model tracking a restricted list of LearningResources.
    """

    image_src = models.ImageField(
        null=True, blank=True, max_length=2083, upload_to=user_list_image_upload_uri
    )

    class Meta:
        verbose_name = "userlist"


class UserListItem(ListItem):
    """
    ListItem model for UserLists
    """

    content_type = models.ForeignKey(
        ContentType,
        limit_choices_to={
            "model__in": ("course", "program", "video", "podcast", "podcastepisode")
        },
        on_delete=models.CASCADE,
    )
    user_list = models.ForeignKey(
        UserList, related_name="items", on_delete=models.CASCADE
    )


class StaffList(LearningList):
    """
    StaffList is similar to UserList but can only be creadted/edited by a specific group of users
    """

    image_src = models.ImageField(
        null=True, blank=True, max_length=2083, upload_to=staff_list_image_upload_uri
    )

    class Meta:
        verbose_name = "stafflist"


class StaffListItem(ListItem):
    """
    ListItem model for StaffLists
    """

    content_type = models.ForeignKey(
        ContentType,
        limit_choices_to={
            "model__in": ("course", "program", "video", "podcast", "podcastepisode")
        },
        on_delete=models.CASCADE,
    )
    staff_list = models.ForeignKey(
        StaffList, related_name="items", on_delete=models.CASCADE
    )


class Program(List, LearningResourceGenericRelationsMixin):
    """
    Program model for MIT programs. Consists of specified list of LearningResources.
    """

    objects = LearningResourceQuerySet.as_manager()

    program_id = models.CharField(max_length=80, null=True)
    image_src = models.URLField(max_length=2048, null=True, blank=True)
    url = models.URLField(null=True, max_length=2048)
    published = models.BooleanField(default=True)
    runs = GenericRelation(LearningResourceRun)

    @property
    def audience(self):
        """Returns the audience for the program"""

        if OfferedBy.micromasters.value in self.offered_by.values_list(
            "name", flat=True
        ):
            return [OPEN, PROFESSIONAL]
        else:
            return [PROFESSIONAL]

    @property
    def certification(self):
        """Returns the certification for the program"""
        return [CERTIFICATE]


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
        limit_choices_to={
            "model__in": (
                "course",
                "stafflist",
                "userlist",
                "program",
                "video",
                "podcast",
                "podcastepisode",
            )
        },
        on_delete=models.CASCADE,
    )
    object_id = models.PositiveIntegerField()
    item = GenericForeignKey("content_type", "object_id")

    class Meta:
        unique_together = ("user", "content_type", "object_id")


class VideoChannel(LearningResource, LearningResourceGenericRelationsMixin):
    """Data model for video channels"""

    platform = models.CharField(max_length=40)
    channel_id = models.CharField(max_length=80)

    full_description = models.TextField(null=True, blank=True)

    published = models.BooleanField(default=True)


class Video(LearningResource, LearningResourceGenericRelationsMixin):
    """Data model for video resources"""

    objects = LearningResourceQuerySet.as_manager()

    video_id = models.CharField(max_length=80)
    platform = models.CharField(max_length=128)

    full_description = models.TextField(null=True, blank=True)
    image_src = models.URLField(max_length=400, null=True, blank=True)
    last_modified = models.DateTimeField(null=True, blank=True)
    duration = models.CharField(null=True, blank=True, max_length=11)

    published = models.BooleanField(default=True)

    url = models.URLField(null=True, max_length=2048)

    transcript = models.TextField(blank=True, default="")

    raw_data = models.TextField(blank=True, default="")

    @property
    def audience(self):
        """Returns the audience"""
        return [OPEN]

    @property
    def certification(self):
        """Returns the certification"""
        return []

    class Meta:
        unique_together = ("platform", "video_id")


class Playlist(List, LearningResourceGenericRelationsMixin):
    """
    Video playlist model, contains videos
    """

    objects = LearningResourceQuerySet.as_manager()

    platform = models.CharField(max_length=40)
    playlist_id = models.CharField(max_length=80)

    channel = models.ForeignKey(
        VideoChannel, on_delete=models.CASCADE, related_name="playlists"
    )

    image_src = models.URLField(max_length=400, null=True, blank=True)
    url = models.URLField(null=True, max_length=2048)
    published = models.BooleanField(default=True)

    has_user_list = models.BooleanField(default=True)
    user_list = models.OneToOneField(
        UserList, on_delete=models.SET_NULL, null=True, related_name="playlist"
    )

    videos = models.ManyToManyField(
        Video, through="PlaylistVideo", through_fields=("playlist", "video")
    )


class PlaylistVideo(models.Model):
    """Join table for Playlist -> Video"""

    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="playlist_videos"
    )
    playlist = models.ForeignKey(
        Playlist, on_delete=models.CASCADE, related_name="playlist_videos"
    )

    position = models.PositiveIntegerField()

    class Meta:
        unique_together = ("playlist", "video")


class Podcast(LearningResource, LearningResourceGenericRelationsMixin):
    """Data model for podcasts"""

    objects = LearningResourceQuerySet.as_manager()

    podcast_id = models.CharField(max_length=80, unique=True)
    full_description = models.TextField(null=True, blank=True)
    image_src = models.URLField(max_length=400, null=True, blank=True)
    published = models.BooleanField(default=True)
    url = models.URLField(null=True, max_length=2048)
    apple_podcasts_url = models.URLField(null=True, max_length=2048)
    google_podcasts_url = models.URLField(null=True, max_length=2048)
    searchable = models.BooleanField(default=True)
    rss_url = models.URLField(null=True, max_length=2048)

    def __str__(self):
        return self.title

    @property
    def platform(self):
        """Platform for podcast"""
        return PlatformType.podcast.value

    @property
    def audience(self):
        """Returns the audience"""
        return [OPEN]

    @property
    def certification(self):
        """Returns the certification"""
        return []

    class Meta:
        ordering = ("id",)


class PodcastEpisode(LearningResource, LearningResourceGenericRelationsMixin):
    """Data model for podcast episodes"""

    objects = LearningResourceQuerySet.as_manager()

    episode_id = models.CharField(max_length=80)
    full_description = models.TextField(null=True, blank=True)
    image_src = models.URLField(max_length=400, null=True, blank=True)
    last_modified = models.DateTimeField(null=True, blank=True)
    podcast = models.ForeignKey(
        Podcast, related_name="episodes", on_delete=models.CASCADE
    )
    published = models.BooleanField(default=True)
    transcript = models.TextField(blank=True, default="")
    url = models.URLField(null=True, max_length=2048)
    episode_link = models.URLField(null=True, max_length=2048)
    searchable = models.BooleanField(default=True)
    duration = models.CharField(null=True, blank=True, max_length=10)
    rss = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.title

    @property
    def platform(self):
        """Platform for podcast episode"""
        return PlatformType.podcast.value

    @property
    def audience(self):
        """Returns the audience"""
        return [OPEN]

    @property
    def certification(self):
        """Returns the certification"""
        return []

    class Meta:
        verbose_name = "podcastepisode"
        unique_together = ("podcast", "episode_id")
        ordering = ("id",)


class Enrollment(TimestampedModel):
    """Data model for enrollments"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    run = models.ForeignKey(
        LearningResourceRun,
        on_delete=models.CASCADE,
        related_name="enrollments",
        null=True,
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="enrollments", null=True
    )
    enrollments_table_run_id = models.CharField(max_length=256, null=True, blank=True)
    enrollment_timestamp = models.DateTimeField(null=True)

    def __str__(self):
        return f"Enrollment user_id={self.user_id} enrollments_table_run_id={self.enrollments_table_run_id}"

    class Meta:
        unique_together = (("user", "run"),)
        unique_together = (("user", "enrollments_table_run_id"),)
