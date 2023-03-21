"""Tests for Course Catalog Filters"""
import pytest
from open_discussions.utils import now_in_utc

from course_catalog.constants import AvailabilityType, OfferedBy, PlatformType
from course_catalog.factories import (
    CourseFactory,
    LearningResourceOfferorFactory,
    LearningResourceRunFactory,
)
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

    course_with_certificate = CourseFactory.create(
        platform=PlatformType.mitx.value, runs=None
    )
    LearningResourceRunFactory.create(
        content_object=course_with_certificate,
        availability=AvailabilityType.upcoming.value,
    )
    pro_course_with_cert = CourseFactory.create(
        platform=PlatformType.xpro.value, runs=None
    )
    LearningResourceRunFactory.create(
        content_object=pro_course_with_cert, availability=AvailabilityType.current.value
    )
    course_without_certificate = CourseFactory.create(
        platform=PlatformType.ocw.value, runs=None
    )
    LearningResourceRunFactory.create(
        content_object=course_without_certificate,
        availability=AvailabilityType.current.value,
    )
    archived_course = CourseFactory.create(platform=PlatformType.mitx.value, runs=None)
    LearningResourceRunFactory.create(
        content_object=archived_course, availability=AvailabilityType.archived.value
    )

    query = CourseFilter({"certificated": "True"}).qs

    assert course_with_certificate in query
    assert pro_course_with_cert in query
    assert course_without_certificate not in query
    assert archived_course not in query

    negative_query = CourseFilter({"certificated": "False"}).qs

    assert course_with_certificate not in negative_query
    assert pro_course_with_cert not in negative_query
    assert course_without_certificate in negative_query
    assert archived_course in negative_query
