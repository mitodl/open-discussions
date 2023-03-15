"""Tests for Course Catalog Filters"""
import pytest

from course_catalog.constants import PlatformType
from course_catalog.factories import CourseFactory
from course_catalog.filters import CourseFilter

pytestmark = pytest.mark.django_db


def test_course_filter_micromasters():
    """test that the platform filter works"""
    mm_course = CourseFactory.create(platform = PlatformType.micromasters.value)
    mitx_course = CourseFactory.create(platform = PlatformType.mitxonline.value)

    query = CourseFilter({"platform": "micromasters"}).qs

    assert mm_course in query
    assert mitx_course not in query


def test_course_filter_audience():
    """Test that the audience filter works"""

    professional_course = CourseFactory.create(platform=PlatformType.xpro.value)
    open_course = CourseFactory.create(platform=PlatformType.mitxonline.value)

    query = CourseFilter({"audience": "professional"}).qs

    assert professional_course in query
    assert open_course not in query


def test_course_filter_multi():
    """Tests that filters can be combined"""
    xpro_course = CourseFactory.create()
    bootcamps_course = CourseFactory.create()
    mitxonline_course = CourseFactory.create()

    xpro_course.platform = PlatformType.xpro.value
    bootcamps_course.platform = PlatformType.bootcamps.value
    mitxonline_course.platform = PlatformType.mitxonline.value

    query = CourseFilter(
        {"audience": "professional", "platform": PlatformType.bootcamps.value}
    ).qs

    assert bootcamps_course in query
    assert xpro_course not in query
    assert mitxonline_course not in query
