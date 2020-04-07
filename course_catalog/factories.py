"""Factories for making test data"""
import random
from datetime import timedelta

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyText
import pytz

from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import (
    AvailabilityType,
    ListType,
    OfferedBy,
    PlatformType,
    PrivacyLevel,
    CONTENT_TYPE_FILE,
    CONTENT_TYPE_PAGE,
)
from course_catalog.models import (
    Course,
    CourseInstructor,
    CourseTopic,
    CoursePrice,
    Bootcamp,
    Program,
    ProgramItem,
    UserList,
    UserListItem,
    LearningResourceRun,
    LearningResourceOfferor,
    Video,
    Playlist,
    VideoChannel,
    ContentFile,
    Podcast,
    PodcastEpisode,
)


# pylint: disable=unused-argument
from open_discussions.factories import UserFactory


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
            PlatformType.bootcamps.value,
        )
    )
    runs = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceRunFactory", "content_object", size=3
    )

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
            PlatformType.bootcamps.value,
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
    content_type = FuzzyChoice((CONTENT_TYPE_FILE, CONTENT_TYPE_PAGE))

    class Meta:
        model = ContentFile


class BootcampRunFactory(LearningResourceRunFactory):
    """LearningResourceRun factory specific to Bootcamps"""

    offered_by = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceOfferorFactory",
        size=1,
        name=OfferedBy.bootcamps.value,
    )


class BootcampFactory(AbstractCourseFactory):
    """Factory for Bootcamps"""

    course_id = factory.Sequence(lambda n: "BOOTCAMP%03d.MIT" % n)
    offered_by = factory.RelatedFactoryList(
        "course_catalog.factories.LearningResourceOfferorFactory",
        size=1,
        name=OfferedBy.bootcamps.value,
    )

    runs = factory.RelatedFactoryList(
        "course_catalog.factories.BootcampRunFactory", "content_object", size=3
    )

    class Meta:
        model = Bootcamp


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
        is_bootcamp = factory.Trait(
            content_object=factory.SubFactory(
                "course_catalog.factories.BootcampFactory"
            )
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


class ProgramItemBootcampFactory(ListItemFactory):
    """Factory for Program Item Bootcamps"""

    content_object = factory.SubFactory(BootcampFactory)

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
    list_type = FuzzyChoice((ListType.LEARNING_PATH.value, ListType.LIST.value))
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
        is_learning_path = factory.Trait(list_type=ListType.LEARNING_PATH.value)
        is_list = factory.Trait(list_type=ListType.LIST.value)
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

    class Meta:
        model = Podcast


class PodcastEpisodeFactory(LearningResourceFactory):
    """Factory for Podcast Episode"""

    episode_id = factory.Sequence(lambda n: "PODCAST-EPISODE-%03d.MIT" % n)

    full_description = factory.Faker("text")
    image_src = factory.Faker("image_url")
    image_src = factory.Faker("image_url")
    podcast = factory.SubFactory("course_catalog.factories.PodcastFactory")
    published = True
    url = factory.Faker("uri")

    class Meta:
        model = PodcastEpisode
