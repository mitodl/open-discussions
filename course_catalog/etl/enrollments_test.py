"""test for enrollments updates"""
from unittest.mock import Mock
import datetime
import pytest
import pytz
from course_catalog.etl.enrollments import update_enrollments_for_user
from course_catalog.models import Enrollment
from course_catalog.factories import CourseFactory, LearningResourceRunFactory
from open_discussions.factories import UserFactory


@pytest.mark.django_db
def test_enrollments_for_user(settings, mocker):
    """test for enrollments_for_user"""

    settings.ATHENA_ACCESS_KEY_ID = "present"
    settings.ATHENA_SECRET_ACCESS_KEY = "present"
    settings.ATHENA_WORK_GROUP = "present"
    settings.ATHENA_REGION_NAME = "present"

    run = LearningResourceRunFactory.create(
        run_id="course-v1:MITx+first_course+run_code"
    )
    course = CourseFactory.create(course_id="MITx+second_course")
    user = UserFactory.create()

    query_results = [
        {
            "enrollment_course_id": "MITx/first_course/run_code",
            "enrollment_created": datetime.datetime(2020, 1, 1, 0, 0, 0, 0),
        },
        {
            "enrollment_course_id": "MITx/second_course/no_match",
            "enrollment_created": datetime.datetime(2020, 1, 2, 0, 0, 0, 0),
        },
        {
            "enrollment_course_id": "MITx/no_match/no_match",
            "enrollment_created": datetime.datetime(2020, 1, 3, 0, 0, 0, 0),
        },
    ]

    mock_pyathena = mocker.patch("course_catalog.etl.enrollments.pyathena.connect")
    mock_pyathena.return_value.cursor.return_value.__iter__ = Mock(
        return_value=iter(query_results)
    )

    update_enrollments_for_user(user)
    enrollments = Enrollment.objects.all()

    assert len(enrollments) == 3

    assert enrollments[0].enrollments_table_run_id == "MITx/first_course/run_code"
    assert enrollments[0].user == user
    assert enrollments[0].run == run
    assert enrollments[0].course == run.content_object
    assert enrollments[0].enrollment_timestamp == datetime.datetime(
        2020, 1, 1, 0, 0, 0, 0, pytz.UTC
    )

    assert enrollments[1].enrollments_table_run_id == "MITx/second_course/no_match"
    assert enrollments[1].user == user
    assert enrollments[1].run is None
    assert enrollments[1].course == course
    assert enrollments[1].enrollment_timestamp == datetime.datetime(
        2020, 1, 2, 0, 0, 0, 0, pytz.UTC
    )

    assert enrollments[2].enrollments_table_run_id == "MITx/no_match/no_match"
    assert enrollments[2].user == user
    assert enrollments[2].run is None
    assert enrollments[2].course is None
    assert enrollments[2].enrollment_timestamp == datetime.datetime(
        2020, 1, 3, 0, 0, 0, 0, pytz.UTC
    )
