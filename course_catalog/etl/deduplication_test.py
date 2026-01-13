"""Tests for the deduplication ETL functions"""
from datetime import datetime

import pytest
import pytz

from course_catalog.constants import AvailabilityType
from course_catalog.etl.deduplication import (
    generate_duplicates_yaml,
    get_most_relevant_run,
)
from course_catalog.factories import (
    CourseFactory,
    LearningResourceOfferorFactory,
    LearningResourceRunFactory,
)
from course_catalog.models import LearningResourceRun


@pytest.mark.django_db
def test_get_most_relevant_run():
    """Verify that most_relevant_run returns the correct run"""
    most_relevant_run = LearningResourceRunFactory.create(
        availability=AvailabilityType.archived.value,
        best_start_date=datetime(2019, 10, 1, tzinfo=pytz.utc),
        run_id="1",
    )
    LearningResourceRunFactory.create(
        availability=AvailabilityType.archived.value,
        best_start_date=datetime(2018, 10, 1, tzinfo=pytz.utc),
        run_id="2",
    )

    assert (
        get_most_relevant_run(LearningResourceRun.objects.filter(run_id__in=["1", "2"]))
        == most_relevant_run
    )

    most_relevant_run = LearningResourceRunFactory.create(
        availability=AvailabilityType.upcoming.value,
        best_start_date=datetime(2017, 10, 1, tzinfo=pytz.utc),
        run_id="3",
    )

    LearningResourceRunFactory.create(
        availability=AvailabilityType.upcoming.value,
        best_start_date=datetime(2020, 10, 1, tzinfo=pytz.utc),
        run_id="4",
    )

    assert (
        get_most_relevant_run(
            LearningResourceRun.objects.filter(run_id__in=["1", "2", "3", "4"])
        )
        == most_relevant_run
    )

    most_relevant_run = LearningResourceRunFactory.create(
        availability=AvailabilityType.current.value, run_id="5"
    )

    assert (
        get_most_relevant_run(
            LearningResourceRun.objects.filter(run_id__in=["1", "2", "3", "4", "5"])
        )
        == most_relevant_run
    )


@pytest.mark.django_db
def test_generate_duplicates_yaml(settings, mocker):
    """Test for generate_duplicates_yaml"""
    duplicate_course1 = CourseFactory.create(title="course1", platform="mitx")
    desired_course1 = CourseFactory.create(title="course1", platform="mitx")
    extra_offered_by = LearningResourceOfferorFactory.create()
    desired_course1.offered_by.add(extra_offered_by)

    duplicate_course2 = CourseFactory.create(title="course2", platform="mitx")
    desired_course2 = CourseFactory.create(title="course2", platform="mitx")

    settings.DUPLICATE_COURSES_URL = "url"
    duplicate_file_content = f"""mitx:
- course_id: {desired_course2.course_id}
  duplicate_course_ids:
  - {desired_course2.course_id}
  - {duplicate_course2.course_id}
  title: course2
"""
    mocker.patch(
        "requests.get",
        autospec=True,
        return_value=mocker.Mock(text=duplicate_file_content),
    )

    expected_output = f"""mitx:
- course_id: {desired_course1.course_id}
  duplicate_course_ids:
  - {desired_course1.course_id}
  - {duplicate_course1.course_id}
  title: course1
- course_id: {desired_course2.course_id}
  duplicate_course_ids:
  - {desired_course2.course_id}
  - {duplicate_course2.course_id}
  title: course2
"""

    assert generate_duplicates_yaml() == expected_output
