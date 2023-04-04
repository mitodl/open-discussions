"""Tests for Course Catalog Filters"""
import pytest

from course_catalog.constants import OfferedBy, PlatformType, AvailabilityType
from course_catalog.factories import CourseFactory, LearningResourceOfferorFactory, LearningResourceRunFactory
from course_catalog.filters import CourseFilter

pytestmark = pytest.mark.django_db


def test_course_filter_micromasters():
    """test that the offered_by filter works"""
    mm = LearningResourceOfferorFactory.create(is_micromasters=True)
    mitx = LearningResourceOfferorFactory.create(is_mitx=True)

    mm_course = CourseFactory.create()
    mitx_course = CourseFactory.create()

    mm_course.offered_by.set([mm])
    mitx_course.offered_by.set([mitx])

    query = CourseFilter({"offered_by": OfferedBy.micromasters.value}).qs

    assert mm_course in query
    assert mitx_course not in query


def test_course_filter_audience():
    """Test that the audience filter works"""

    professional_course = CourseFactory.create(platform=PlatformType.xpro.value)
    open_course = CourseFactory.create(platform=PlatformType.mitxonline.value)

    query = CourseFilter({"audience": "professional"}).qs

    assert professional_course in query
    assert open_course not in query


def test_course_filter_availability():
    """Test that availability filter works"""
    upcoming_course = CourseFactory.create(runs=None)
    LearningResourceRunFactory.create(course=upcoming_course, availability=AvailabilityType.upcoming.value)
    archived_course = CourseFactory.create(runs=None)
    LearningResourceRunFactory.create(course=archived_course, availability=AvailabilityType.archived.value)
    starting_soon_course = CourseFactory.create(runs=None)
    LearningResourceRunFactory.create(course=starting_soon_course, availability=AvailabilityType.starting_soon.value)
    current_course = CourseFactory.create(runs=None)
    LearningResourceRunFactory.create(course=current_course, availability=AvailabilityType.current.value)

    query = CourseFilter({"availability": AvailabilityType.upcoming.value}).qs

    assert upcoming_course in query
    assert archived_course not in query
    assert starting_soon_course not in query
    assert current_course not in query
