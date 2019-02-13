"""Factories for making test data"""
import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from course_catalog.constants import PlatformType
from course_catalog.models import Course, CourseInstructor, CourseTopic, CoursePrice

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
