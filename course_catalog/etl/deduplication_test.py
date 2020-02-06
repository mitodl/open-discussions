"""Tests for the deduplication ETL functions"""
from datetime import datetime
import pytest
import pytz
from course_catalog.etl.deduplication import get_most_relevant_run
from course_catalog.constants import AvailabilityType
from course_catalog.factories import LearningResourceRunFactory
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
