"""Tests for ETL loaders"""
# pylint: disable=redefined-outer-name,too-many-locals
from types import SimpleNamespace

from django.contrib.contenttypes.models import ContentType
from django.forms.models import model_to_dict
import pytest

from course_catalog.etl.loaders import (
    load_program,
    load_course,
    load_run,
    load_topics,
    load_prices,
    load_instructors,
)
from course_catalog.etl.xpro import _parse_datetime
from course_catalog.factories import (
    ProgramFactory,
    CourseFactory,
    LearningResourceRunFactory,
    CoursePriceFactory,
    CourseTopicFactory,
    CourseInstructorFactory,
)
from course_catalog.models import Program, Course, LearningResourceRun, ProgramItem

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("mock_upsert_tasks")]


@pytest.fixture
def mock_upsert_tasks(mocker):
    """Mock out the upsert task helpers"""
    return SimpleNamespace(
        upsert_course=mocker.patch("search.task_helpers.upsert_course"),
        delete_course=mocker.patch("search.task_helpers.delete_course"),
        upsert_program=mocker.patch("search.task_helpers.upsert_program"),
        delete_program=mocker.patch("search.task_helpers.delete_program"),
    )


@pytest.mark.parametrize("program_exists", [True, False])
@pytest.mark.parametrize("is_published", [True, False])
@pytest.mark.parametrize("courses_exist", [True, False])
@pytest.mark.parametrize("has_prices", [True, False])
@pytest.mark.parametrize("has_retired_course", [True, False])
def test_load_program(
    mock_upsert_tasks,
    program_exists,
    is_published,
    courses_exist,
    has_prices,
    has_retired_course,
):  # pylint: disable=too-many-arguments
    """Test that load_program loads the program"""
    program = (
        ProgramFactory.create(published=is_published, runs=[])
        if program_exists
        else ProgramFactory.build(published=is_published, runs=[])
    )
    courses = (
        CourseFactory.create_batch(2) if courses_exist else CourseFactory.build_batch(2)
    )
    prices = CoursePriceFactory.build_batch(2) if has_prices else []

    before_course_count = len(courses) if courses_exist else 0
    after_course_count = len(courses)

    if program_exists and has_retired_course:
        course = CourseFactory.create()
        before_course_count += 1
        after_course_count += 1
        ProgramItem.objects.create(
            program=program,
            content_type=ContentType.objects.get(model="course"),
            object_id=course.id,
            position=1,
        )
        assert program.items.count() == 1
    else:
        assert program.items.count() == 0

    assert Program.objects.count() == (1 if program_exists else 0)
    assert Course.objects.count() == before_course_count

    run_data = {
        "prices": [
            {
                "price": price.price,
                "mode": price.mode,
                "upgrade_deadline": price.upgrade_deadline,
            }
            for price in prices
        ],
        "run_id": program.program_id,
        "enrollment_start": "2017-01-01T00:00:00Z",
        "start_date": "2017-01-20T00:00:00Z",
        "end_date": "2017-06-20T00:00:00Z",
        "best_start_date": "2017-06-20T00:00:00Z",
        "best_end_date": "2017-06-20T00:00:00Z",
    }

    result = load_program(
        {
            "program_id": program.program_id,
            "title": program.title,
            "url": program.url,
            "image_src": program.image_src,
            "published": is_published,
            "runs": [run_data],
            "courses": [{"course_id": course.course_id} for course in courses],
        }
    )

    if program_exists and not is_published:
        mock_upsert_tasks.delete_program.assert_called_with(result)
    elif is_published:
        mock_upsert_tasks.upsert_program.assert_called_with(result)
    else:
        mock_upsert_tasks.delete_program.assert_not_called()
        mock_upsert_tasks.upsert_program.assert_not_called()

    assert Program.objects.count() == 1
    assert Course.objects.count() == after_course_count

    # assert we got a program back and that each course is in a program
    assert isinstance(result, Program)
    assert result.items.count() == len(courses)
    assert result.runs.count() == 1
    assert result.runs.first().prices.count() == len(prices)
    assert sorted(
        [
            (price.price, price.mode, price.upgrade_deadline)
            for price in result.runs.first().prices.all()
        ]
    ) == sorted([(price.price, price.mode, price.upgrade_deadline) for price in prices])

    assert result.runs.first().best_start_date == _parse_datetime(
        run_data["best_start_date"]
    )

    for item, data in zip(result.items.all(), courses):
        course = item.item
        assert isinstance(course, Course)
        assert course.course_id == data.course_id


@pytest.mark.parametrize("course_exists", [True, False])
@pytest.mark.parametrize("is_published", [True, False])
def test_load_course(mock_upsert_tasks, course_exists, is_published):
    """Test that load_course loads the course"""
    course = (
        CourseFactory.create(runs=None, published=is_published)
        if course_exists
        else CourseFactory.build()
    )
    assert Course.objects.count() == (1 if course_exists else 0)
    assert LearningResourceRun.objects.count() == 0

    props = model_to_dict(CourseFactory.build(published=is_published))
    props["course_id"] = course.course_id
    del props["id"]
    run = model_to_dict(LearningResourceRunFactory.build())
    del run["content_type"]
    del run["object_id"]
    del run["id"]
    props["runs"] = [run]

    result = load_course(props)

    if course_exists and not is_published:
        mock_upsert_tasks.delete_course.assert_called_with(result)
    elif is_published:
        mock_upsert_tasks.upsert_course.assert_called_with(result)
    else:
        mock_upsert_tasks.delete_program.assert_not_called()
        mock_upsert_tasks.upsert_course.assert_not_called()

    assert Course.objects.count() == 1
    assert LearningResourceRun.objects.count() == 1

    # assert we got a course back
    assert isinstance(result, Course)

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"


@pytest.mark.parametrize("run_exists", [True, False])
def test_load_run(run_exists):
    """Test that load_run loads the course run"""
    course = CourseFactory.create(runs=None)
    learning_resource_run = (
        LearningResourceRunFactory.create(content_object=course)
        if run_exists
        else LearningResourceRunFactory.build()
    )

    props = model_to_dict(LearningResourceRunFactory.build())
    props["run_id"] = learning_resource_run.run_id
    del props["content_type"]
    del props["object_id"]
    del props["id"]

    assert LearningResourceRun.objects.count() == (1 if run_exists else 0)

    result = load_run(course, props)

    assert LearningResourceRun.objects.count() == 1

    assert result.content_object == course

    # assert we got a course run back
    assert isinstance(result, LearningResourceRun)

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"


@pytest.mark.parametrize(
    "parent_factory", [CourseFactory, ProgramFactory, LearningResourceRunFactory]
)
@pytest.mark.parametrize("topics_exist", [True, False])
def test_load_topics(parent_factory, topics_exist):
    """Test that load_topics creates and/or assigns topics to the parent object"""
    topics = (
        CourseTopicFactory.create_batch(3)
        if topics_exist
        else CourseTopicFactory.build_batch(3)
    )
    parent = parent_factory.create(no_topics=True)

    assert parent.topics.count() == 0

    load_topics(parent, [{"name": topic.name} for topic in topics])

    assert parent.topics.count() == len(topics)


@pytest.mark.parametrize("prices_exist", [True, False])
def test_load_prices(prices_exist):
    """Test that load_prices creates and/or assigns prices to the parent object"""
    prices = (
        CoursePriceFactory.create_batch(3)
        if prices_exist
        else CoursePriceFactory.build_batch(3)
    )
    course_run = LearningResourceRunFactory.create(no_prices=True)

    assert course_run.prices.count() == 0

    load_prices(
        course_run,
        [
            {
                "price": price.price,
                "mode": price.mode,
                "upgrade_deadline": price.upgrade_deadline,
            }
            for price in prices
        ],
    )

    assert course_run.prices.count() == len(prices)


@pytest.mark.parametrize("instructor_exists", [True, False])
def test_load_instructors(instructor_exists):
    """Test that load_instructors creates and/or assigns instructors to the course run"""
    instructors = (
        CourseInstructorFactory.create_batch(3)
        if instructor_exists
        else CourseInstructorFactory.build_batch(3)
    )
    run = LearningResourceRunFactory.create(no_instructors=True)

    assert run.instructors.count() == 0

    load_instructors(
        run, [{"full_name": instructor.full_name} for instructor in instructors]
    )

    assert run.instructors.count() == len(instructors)
