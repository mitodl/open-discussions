"""Factories for making test data"""
import random
from datetime import timedelta

import factory
import pytz
from django.contrib.contenttypes.models import ContentType
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyText

from course_catalog.constants import (
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_PAGE,
    OCW_DEPARTMENTS,
    AvailabilityType,
    OfferedBy,
    PlatformType,
    PrivacyLevel,
    StaffListType,
    UserListType,
)
from course_catalog.models import (
    ContentFile,
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    LearningResourceOfferor,
    LearningResourceRun,
    Playlist,
    Podcast,
    PodcastEpisode,
    Program,
    ProgramItem,
    StaffList,
    StaffListItem,
    UserList,
    UserListItem,
    Video,
    VideoChannel,
)

# pylint: disable=unused-argument
from open_discussions.factories import UserFactory
from search.constants import (
    OCW_TYPE_ASSIGNMENTS,
    OCW_TYPE_EXAMS,
    OCW_TYPE_LABS,
    OCW_TYPE_LECTURE_AUDIO,
    OCW_TYPE_LECTURE_NOTES,
    OCW_TYPE_LECTURE_VIDEOS,
    OCW_TYPE_PROJECTS,
    OCW_TYPE_READINGS,
    OCW_TYPE_RECITATIONS,
    OCW_TYPE_TEXTBOOKS,
    OCW_TYPE_TOOLS,
    OCW_TYPE_TUTORIALS,
    OCW_TYPE_VIDEOS,
)


def _post_gen_prices(obj, create, extracted, **kwarg):
    """PostGeneration function for prices"""
    if not create:
        return

    if extracted is None:
        extracted = CoursePriceFactory.create_batch(random.randint(0, 3))

    obj.prices.set(extracted)


def _post_gen_topics(obj, create, extracted, **kwargs):
    """PostGeneration function for topics"""
    if not create:
        return

    if extracted is None:
        extracted = CourseTopicFactory.create_batch(random.randint(0, 5))

    obj.topics.set(extracted)


class CourseInstructorFactory(DjangoModelFactory):
    """Factory for course instructors"""

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    full_name = factory.LazyAttribute(lambda ci: f"{ci.first_name} {ci.last_name}")

    class Meta:
        model = CourseInstructor
        django_get_or_create = ("first_name", "last_name", "full_name")


class CourseTopicFactory(DjangoModelFactory):
    """Factory for course topics"""

    name = factory.Sequence(lambda n: "Topic %03d" % n)

    class Meta:
        model = CourseTopic
        django_get_or_create = ("name",)


class CoursePriceFactory(DjangoModelFactory):
    """Factory for course prices"""

    price = factory.Sequence(lambda n: 0.00 + float(n))
    mode = factory.Faker("word")
    upgrade_deadline = None

    class Meta:
        model = CoursePrice
        django_get_or_create = ("price", "mode", "upgrade_deadline")


class LearningResourceOfferorFactory(DjangoModelFactory):
    """Factory for LearningResourceOfferor"""

    name = FuzzyChoice(
        (
            OfferedBy.mitx.value,
            OfferedBy.ocw.value,
            OfferedBy.micromasters.value,
            OfferedBy.xpro.value,
            OfferedBy.oll.value,
            OfferedBy.bootcamps.value,
        )
    )

    class Meta:
        model = LearningResourceOfferor
        django_get_or_create = ("name",)

    class Params:
        is_xpro = factory.Trait(name=OfferedBy.xpro.value)
        is_bootcamps = factory.Trait(name=OfferedBy.bootcamps.value)
        is_mitx = factory.Trait(name=OfferedBy.mitx.value)
        is_oll = factory.Trait(name=OfferedBy.oll.value)
        is_micromasters = factory.Trait(name=OfferedBy.micromasters.value)
        is_ocw = factory.Trait(name=OfferedBy.ocw.value)


class LearningResourceFactory(DjangoModelFactory):
    """Factory for LearningResource subclasses"""

    title = factory.Faker("word")
    short_description = factory.Faker("sentence")

    topics = factory.PostGeneration(_post_gen_topics)
    offered_by = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceOfferorFactory", size=1
    )

    class Meta:
        abstract = True

    class Params:
        no_topics = factory.Trait(topics=[])


class AbstractCourseFactory(LearningResourceFactory):
    """Factory for AbstractCourse subclasses"""

    full_description = factory.Faker("text")
    image_src = factory.Faker("image_url")
    image_description = factory.Faker("text", max_nb_chars=300)

    last_modified = factory.Faker("past_datetime", tzinfo=pytz.utc)

    url = factory.Faker("uri")

    class Meta:
        abstract = True


class CourseFactory(AbstractCourseFactory):
    """Factory for Courses"""

    course_id = factory.Sequence(lambda n: "COURSE%03d.MIT" % n)
    platform = FuzzyChoice(
        (
            PlatformType.mitx.value,
            PlatformType.ocw.value,
            PlatformType.micromasters.value,
            PlatformType.xpro.value,
            PlatformType.oll.value,
        )
    )
    department = factory.List([FuzzyChoice(OCW_DEPARTMENTS.keys())])
    runs = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceRunFactory", "content_object", size=3
    )
    course_feature_tags = factory.List(
        [factory.Faker("word") for x in range(random.randrange(3))]
    )
    extra_course_numbers = factory.List([])
    ocw_next_course = False

    class Meta:
        model = Course


class LearningResourceRunFactory(AbstractCourseFactory):
    """Factory for LearningResourceRuns"""

    run_id = factory.Sequence(lambda n: "COURSEN%03d.MIT_run" % n)
    platform = FuzzyChoice(
        (
            PlatformType.mitx.value,
            PlatformType.ocw.value,
            PlatformType.micromasters.value,
            PlatformType.xpro.value,
            PlatformType.oll.value,
        )
    )
    content_object = factory.SubFactory(CourseFactory)
    object_id = factory.SelfAttribute("content_object.id")
    content_type = factory.LazyAttribute(
        lambda o: ContentType.objects.get_for_model(o.content_object)
    )

    availability = FuzzyChoice(
        (
            AvailabilityType.current.value,
            AvailabilityType.upcoming.value,
            AvailabilityType.starting_soon.value,
            AvailabilityType.archived.value,
        )
    )
    enrollment_start = factory.Faker("date_time", tzinfo=pytz.utc)
    enrollment_end = factory.LazyAttribute(
        lambda obj: (obj.enrollment_start + timedelta(days=45))
        if obj.enrollment_start
        else None
    )
    start_date = factory.LazyAttribute(
        lambda obj: obj.enrollment_start + timedelta(days=15)
    )
    end_date = factory.LazyAttribute(
        lambda obj: obj.start_date + timedelta(days=90) if obj.start_date else None
    )
    language = factory.Faker("word")
    year = factory.Faker("year")
    url = factory.Faker("word")
    prices = factory.PostGeneration(_post_gen_prices)

    @factory.post_generation
    def instructors(self, create, extracted, **kwargs):
        """Create instructors for course"""
        if not create:
            return

        if extracted is None:
            extracted = CourseInstructorFactory.create_batch(random.randint(0, 3))

        self.instructors.set(extracted)

    class Meta:
        model = LearningResourceRun

    class Params:
        no_prices = factory.Trait(prices=[])
        no_instructors = factory.Trait(instructors=[])

        in_past = factory.Trait(
            enrollment_start=factory.Faker(
                "date_time_between", end_date="-270d", tzinfo=pytz.utc
            )
        )
        in_future = factory.Trait(
            enrollment_start=factory.Faker(
                "date_time_between", start_date="+15d", tzinfo=pytz.utc
            )
        )


class ContentFileFactory(DjangoModelFactory):
    """Factory for ContentFiles"""

    run = factory.SubFactory(LearningResourceRunFactory)
    key = factory.Faker("file_path")
    title = factory.Faker("sentence")
    description = factory.Faker("sentence")
    uid = factory.Faker("text", max_nb_chars=32)
    url = factory.Faker("url")
    image_src = FuzzyChoice(("https://img.youtube.com/thumb.jpg", None))
    short_url = factory.Faker("word")
    content_type = FuzzyChoice((CONTENT_TYPE_FILE, CONTENT_TYPE_PAGE))
    file_type = FuzzyChoice(("application/pdf", "video/mp4", "text"))
    section = FuzzyChoice((OCW_TYPE_EXAMS, OCW_TYPE_LECTURE_NOTES, None))
    learning_resource_types = FuzzyChoice(
        (
            [OCW_TYPE_ASSIGNMENTS],
            [OCW_TYPE_EXAMS],
            [OCW_TYPE_LABS],
            [OCW_TYPE_LECTURE_AUDIO],
            [OCW_TYPE_LECTURE_NOTES],
            [OCW_TYPE_LECTURE_VIDEOS],
            [OCW_TYPE_PROJECTS],
            [OCW_TYPE_READINGS],
            [OCW_TYPE_RECITATIONS],
            [OCW_TYPE_TEXTBOOKS],
            [OCW_TYPE_TOOLS],
            [OCW_TYPE_TUTORIALS],
            [OCW_TYPE_VIDEOS],
        )
    )
    published = True

    class Meta:
        model = ContentFile


class ListItemFactory(DjangoModelFactory):
    """Factory for List Items"""

    position = factory.Sequence(lambda n: n)
    object_id = factory.SelfAttribute("content_object.id")
    content_type = factory.LazyAttribute(
        lambda o: ContentType.objects.get_for_model(o.content_object)
    )

    class Meta:
        exclude = ["content_object"]
        abstract = True


class UserListItemFactory(ListItemFactory):
    """Factory for UserList items"""

    user_list = factory.SubFactory("course_catalog.factories.UserListFactory")
    content_object = factory.SubFactory("course_catalog.factories.CourseFactory")

    class Meta:
        model = UserListItem

    class Params:
        is_course = factory.Trait(
            content_object=factory.SubFactory("course_catalog.factories.CourseFactory")
        )
        is_userlist = factory.Trait(
            content_object=factory.SubFactory(
                "course_catalog.factories.UserListFactory"
            )
        )
        is_program = factory.Trait(
            content_object=factory.SubFactory("course_catalog.factories.ProgramFactory")
        )
        is_video = factory.Trait(
            content_object=factory.SubFactory("course_catalog.factories.VideoFactory")
        )


class ProgramItemCourseFactory(ListItemFactory):
    """Factory for Program Item Courses"""

    content_object = factory.SubFactory(CourseFactory)

    class Meta:
        model = ProgramItem


class ProgramFactory(LearningResourceFactory):
    """Factory for Programs"""

    program_id = factory.Sequence(lambda n: n)
    image_src = factory.Faker("image_url")
    url = factory.Faker("uri")

    runs = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceRunFactory", "content_object", size=1
    )

    class Meta:
        model = Program


class UserListFactory(DjangoModelFactory):
    """Factory for Learning Paths"""

    title = FuzzyText()
    list_type = FuzzyChoice((UserListType.LEARNING_PATH.value, UserListType.LIST.value))
    privacy_level = FuzzyChoice((PrivacyLevel.public.value, PrivacyLevel.private.value))
    image_src = factory.Faker("file_path", extension="jpg")

    author = factory.SubFactory(UserFactory)

    @factory.post_generation
    def topics(self, create, extracted, **kwargs):
        """Create topics for learning path"""
        if not create:
            return

        if extracted:
            for topic in extracted:
                self.topics.add(topic)

    class Meta:
        model = UserList

    class Params:
        is_learning_path = factory.Trait(list_type=UserListType.LEARNING_PATH.value)
        is_list = factory.Trait(list_type=UserListType.LIST.value)
        is_public = factory.Trait(privacy_level=PrivacyLevel.public.value)
        is_private = factory.Trait(privacy_level=PrivacyLevel.private.value)


class StaffListItemFactory(ListItemFactory):
    """Factory for StaffList items"""

    staff_list = factory.SubFactory("course_catalog.factories.StaffListFactory")
    content_object = factory.SubFactory("course_catalog.factories.CourseFactory")

    class Meta:
        model = StaffListItem

    class Params:
        is_course = factory.Trait(
            content_object=factory.SubFactory("course_catalog.factories.CourseFactory")
        )
        is_userlist = factory.Trait(
            content_object=factory.SubFactory(
                "course_catalog.factories.UserListFactory"
            )
        )
        is_stafflist = factory.Trait(
            content_object=factory.SubFactory(
                "course_catalog.factories.StaffListFactory"
            )
        )
        is_program = factory.Trait(
            content_object=factory.SubFactory("course_catalog.factories.ProgramFactory")
        )
        is_video = factory.Trait(
            content_object=factory.SubFactory("course_catalog.factories.VideoFactory")
        )


class StaffListFactory(DjangoModelFactory):
    """Factory for Staff Lists"""

    title = FuzzyText()
    list_type = FuzzyChoice((StaffListType.LIST.value, StaffListType.PATH.value))
    privacy_level = FuzzyChoice((PrivacyLevel.public.value, PrivacyLevel.private.value))
    image_src = factory.Faker("file_path", extension="jpg")

    author = factory.SubFactory(UserFactory)

    @factory.post_generation
    def topics(self, create, extracted, **kwargs):
        """Create topics for learning path"""
        if not create:
            return

        if extracted:
            for topic in extracted:
                self.topics.add(topic)

    class Meta:
        model = StaffList

    class Params:
        is_path = factory.Trait(list_type=StaffListType.PATH.value)
        is_list = factory.Trait(list_type=StaffListType.LIST.value)
        is_public = factory.Trait(privacy_level=PrivacyLevel.public.value)
        is_private = factory.Trait(privacy_level=PrivacyLevel.private.value)


class VideoFactory(LearningResourceFactory):
    """Factory for Video"""

    video_id = factory.Sequence(lambda n: "VIDEO-%03d.MIT" % n)
    platform = FuzzyChoice([PlatformType.youtube.value])

    full_description = factory.Faker("text")
    image_src = factory.Faker("image_url")

    last_modified = factory.Faker("past_datetime", tzinfo=pytz.utc)

    url = factory.Faker("uri")

    transcript = factory.Faker("text")

    offered_by = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceOfferorFactory",
        size=1,
        name=OfferedBy.ocw.value,
    )

    class Meta:
        model = Video


class VideoChannelFactory(LearningResourceFactory):
    """Factory for VideoChannel"""

    channel_id = factory.Sequence(lambda n: "VIDEO-CHANNEL-%03d.MIT" % n)
    platform = FuzzyChoice([PlatformType.youtube.value])

    full_description = factory.Faker("text")
    published = True

    offered_by = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceOfferorFactory",
        size=1,
        name=OfferedBy.ocw.value,
    )

    playlists = factory.RelatedFactoryList(
        "course_catalog.factories.PlaylistFactory", "channel", size=1
    )

    class Meta:
        model = VideoChannel


class PlaylistFactory(LearningResourceFactory):
    """Factory for Playlist"""

    playlist_id = factory.Sequence(lambda n: "VIDEO-PLAYLIST-%03d.MIT" % n)
    platform = FuzzyChoice([PlatformType.youtube.value])

    image_src = factory.Faker("image_url")
    url = factory.Faker("image_url")
    published = True

    offered_by = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceOfferorFactory",
        size=1,
        name=OfferedBy.ocw.value,
    )

    channel = factory.SubFactory("course_catalog.factories.VideoChannelFactory")

    has_user_list = False
    user_list = None

    class Meta:
        model = Playlist


class PodcastFactory(LearningResourceFactory):
    """Factory for Podcast"""

    podcast_id = factory.Sequence(lambda n: "PODCAST-%03d.MIT" % n)

    full_description = factory.Faker("text")
    image_src = factory.Faker("image_url")
    published = True
    url = factory.Faker("uri")
    apple_podcasts_url = factory.Faker("uri")
    google_podcasts_url = factory.Faker("uri")
    rss_url = factory.Faker("uri")

    class Meta:
        model = Podcast


class PodcastEpisodeFactory(LearningResourceFactory):
    """Factory for Podcast Episode"""

    episode_id = factory.Sequence(lambda n: "PODCAST-EPISODE-%03d.MIT" % n)

    full_description = factory.Faker("text")
    image_src = factory.Faker("image_url")
    podcast = factory.SubFactory("course_catalog.factories.PodcastFactory")
    published = True
    url = factory.Faker("uri")
    last_modified = factory.Faker("past_datetime", tzinfo=pytz.utc)
    rss = factory.Faker("text")

    class Meta:
        model = PodcastEpisode
