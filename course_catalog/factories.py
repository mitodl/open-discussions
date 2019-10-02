"""Factories for making test data"""
import random
from datetime import timedelta

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyText
import pytz

from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PlatformType, AvailabilityType, ListType, OfferedBy
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
)


# pylint: disable=unused-argument


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


class LearningResourceFactory(DjangoModelFactory):
    """Factory for LearningResource subclasses"""

    title = factory.Faker("word")
    short_description = factory.Faker("sentence")

    topics = factory.PostGeneration(_post_gen_topics)

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
    platform = FuzzyChoice((PlatformType.mitx.value, PlatformType.ocw.value))
    offered_by = FuzzyChoice(
        (
            OfferedBy.mitx.value,
            OfferedBy.ocw.value,
            OfferedBy.micromasters.value,
            OfferedBy.xpro.value,
        )
    )
    runs = factory.RelatedFactoryList(
        "course_catalog.factories.RunFactory", "content_object", size=3
    )

    class Meta:
        model = Course

    class Params:
        is_mitx = factory.Trait(offered_by=OfferedBy.mitx.value)
        is_micromasters = factory.Trait(offered_by=OfferedBy.micromasters.value)
        is_xpro = factory.Trait(offered_by=OfferedBy.xpro.value)
        is_ocw = factory.Trait(offered_by=OfferedBy.ocw.value)


class RunFactory(AbstractCourseFactory):
    """Factory for CourseRuns"""

    run_id = factory.Sequence(lambda n: "COURSEN%03d.MIT_run" % n)
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


class BootcampFactory(AbstractCourseFactory):
    """Factory for Bootcamps"""

    course_id = factory.Sequence(lambda n: "BOOTCAMP%03d.MIT" % n)
    offered_by = OfferedBy.bootcamps.value

    runs = factory.RelatedFactoryList(
        "course_catalog.factories.RunFactory", "content_object", size=3
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
        "course_catalog.factories.RunFactory", "content_object", size=1
    )

    class Meta:
        model = Program


class UserListCourseFactory(ListItemFactory):
    """Factory for Learning Path Item Courses"""

    content_object = factory.SubFactory(CourseFactory)

    class Meta:
        model = UserListItem


class UserListBootcampFactory(ListItemFactory):
    """Factory for Learning Path Item Bootcamps"""

    content_object = factory.SubFactory(BootcampFactory)

    class Meta:
        model = UserListItem


class UserListFactory(DjangoModelFactory):
    """Factory for Learning Paths"""

    title = FuzzyText()
    list_type = FuzzyChoice((ListType.LEARNING_PATH.value, ListType.LIST.value))

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
