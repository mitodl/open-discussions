"""Factories for making test data"""
import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyText

from django.contrib.contenttypes.models import ContentType

from course_catalog.constants import PlatformType, AvailabilityType
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
)


# pylint: disable=unused-argument


class CourseInstructorFactory(DjangoModelFactory):
    """Factory for course instructors"""

    first_name = factory.Faker("name")
    last_name = factory.Faker("name")

    class Meta:
        model = CourseInstructor


class CourseTopicFactory(DjangoModelFactory):
    """Factory for course topics"""

    name = factory.Sequence(lambda n: "Topic %03d" % n)

    class Meta:
        model = CourseTopic


class CoursePriceFactory(DjangoModelFactory):
    """Factory for course prices"""

    price = factory.Sequence(lambda n: 0.00 + float(n))
    mode = factory.Faker("word")

    class Meta:
        model = CoursePrice


class CourseFactory(DjangoModelFactory):
    """Factory for Courses"""

    course_id = factory.Sequence(lambda n: "COURSE%03d.MIT" % n)
    platform = FuzzyChoice((PlatformType.mitx.value, PlatformType.ocw.value))
    availability = FuzzyChoice(
        (
            AvailabilityType.current.value,
            AvailabilityType.upcoming.value,
            AvailabilityType.starting_soon.value,
            AvailabilityType.archived.value,
        )
    )

    @factory.post_generation
    def instructors(self, create, extracted, **kwargs):
        """Create instructors for course"""
        if not create:
            return

        if extracted:
            for instructor in extracted:
                self.instructors.add(instructor)

    @factory.post_generation
    def topics(self, create, extracted, **kwargs):
        """Create topics for course"""
        if not create:
            return

        if extracted:
            for topic in extracted:
                self.topics.add(topic)

    @factory.post_generation
    def prices(self, create, extracted, **kwargs):
        """Create prices for course"""
        if not create:
            return

        if extracted:
            for price in extracted:
                self.prices.add(price)

    class Meta:
        model = Course


class BootcampFactory(DjangoModelFactory):
    """Factory for Bootcamps"""

    course_id = factory.Sequence(lambda n: "BOOTCAMP%03d.MIT" % n)
    availability = FuzzyChoice(
        (
            AvailabilityType.current.value,
            AvailabilityType.upcoming.value,
            AvailabilityType.starting_soon.value,
            AvailabilityType.archived.value,
        )
    )

    @factory.post_generation
    def instructors(self, create, extracted, **kwargs):
        """Create instructors for bootcamp"""
        if not create:
            return

        if extracted:
            for instructor in extracted:
                self.instructors.add(instructor)

    @factory.post_generation
    def topics(self, create, extracted, **kwargs):
        """Create topics for bootcamp"""
        if not create:
            return

        if extracted:
            for topic in extracted:
                self.topics.add(topic)

    @factory.post_generation
    def prices(self, create, extracted, **kwargs):
        """Create prices for bootcamp"""
        if not create:
            return

        if extracted:
            for price in extracted:
                self.prices.add(price)

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


class ProgramFactory(DjangoModelFactory):
    """Factory for Programs"""

    title = FuzzyText()

    @factory.post_generation
    def topics(self, create, extracted, **kwargs):
        """Create topics for program"""
        if not create:
            return

        if extracted:
            for topic in extracted:
                self.topics.add(topic)

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
