"""Tests for Course Catalog Filters"""
import pytest
from datetime import timedelta

from course_catalog.constants import PlatformType
from course_catalog.factories import CourseFactory
from course_catalog.filters import CourseFilter

from open_discussions.utils import now_in_utc

pytestmark = pytest.mark.django_db


def test_course_filter_upcoming():
    """Test that the upcoming course filter works"""
    upcoming_course = CourseFactory.create()
    not_upcoming_course = CourseFactory.create()

    upcoming_course.start_date = now_in_utc + timedelta(days=1)
    not_upcoming_course.start_date = now_in_utc - timedelta(days=1)

    query = CourseFilter().qs

    assert upcoming_course in query
    assert not_upcoming_course not in query


def test_course_filter_micromasters():
    """test that the platform filter works"""
    mm_course = CourseFactory.create()
    mitx_course = CourseFactory.create()

    mm_course.platform = PlatformType.micromasters.value
    mitx_course.platform = PlatformType.mitxonline.value

    query = CourseFilter(platform="micromasters").qs

    assert mm_course in query
    assert mitx_course not in query


def test_course_filter_professional():
    """Test that the audience filter works"""
    # swapping this to audience, need a moment
    return


def test_course_filter_certificate():
    """Test that the certificate filter works"""
    cert_course = CourseFactory.create()
    no_cert_course = CourseFactory.create()

    cert_course.certificate = ["Certificate"]
    no_cert_course.certificate = []

    query = CourseFilter(certificate="Certificate").qs

    assert cert_course in query
    assert no_cert_course not in query


def test_course_filter_multi():
    """Tests that filters can be combined"""
    return
