"""Tests for Course Catalog Filters"""
import pytest

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.factories import CourseFactory, LearningResourceOfferorFactory
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


def test_course_filter_certificated():
    """Test that the certificated filter works"""

    course_with_certificate = CourseFactory.create()
    course_without_certificate = CourseFactory.create()

    query = CourseFilter({"certificated": "True"}).qs

    assert course_with_certificate in query
    assert course_without_certificate in query
