"""Tests for ETL loaders"""
# pylint: disable=redefined-outer-name
from types import SimpleNamespace

from django.contrib.contenttypes.models import ContentType
from django.forms.models import model_to_dict
import pytest

from course_catalog.etl.loaders import (
    load_programs,
    load_program,
    load_course,
    load_run,
    load_topics,
    load_prices,
    load_instructors,
)
from course_catalog.factories import (
    ProgramFactory,
    CourseFactory,
    RunFactory,
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


def test_load_programs():
    """Test that load_programs loads each program"""
    programs = ProgramFactory.build_batch(2)

    assert Program.objects.count() == 0
    assert Course.objects.count() == 0

    results = load_programs(
        [
            {
                "program_id": program.program_id,
                "title": program.title,
                "url": program.url,
                "image_src": program.image_src,
                "courses": [],
            }
            for program in programs
        ]
    )

    assert len(results) == len(programs)

    assert Program.objects.count() == len(programs)
    assert Course.objects.count() == 0

    for program, data in zip(results, programs):
        # assert we got programs back and that each course is in a program
        assert isinstance(program, Program)
        assert program.items.count() == 0
        assert program.program_id == data.program_id


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
        ProgramFactory.create(published=is_published)
        if program_exists
        else ProgramFactory.build(published=is_published)
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

    result = load_program(
        {
            "program_id": program.program_id,
            "title": program.title,
            "url": program.url,
            "image_src": program.image_src,
            "published": is_published,
            "prices": [
                {
                    "price": price.price,
                    "mode": price.mode,
                    "upgrade_deadline": price.upgrade_deadline,
                }
                for price in prices
            ],
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
    assert result.prices.count() == len(prices)
    assert sorted(
        [
            (price.price, price.mode, price.upgrade_deadline)
            for price in result.prices.all()
        ]
    ) == sorted([(price.price, price.mode, price.upgrade_deadline) for price in prices])

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
    run = model_to_dict(RunFactory.build())
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


@pytest.mark.parametrize("course_run_exists", [True, False])
def test_load_course_run(course_run_exists):
    """Test that load_run loads the course run"""
    course = CourseFactory.create(runs=None)
    course_run = (
        RunFactory.create(content_object=course)
        if course_run_exists
        else RunFactory.build()
    )

    props = model_to_dict(RunFactory.build())
    props["run_id"] = course_run.run_id
    del props["content_type"]
    del props["object_id"]
    del props["id"]

    assert LearningResourceRun.objects.count() == (1 if course_run_exists else 0)

    result = load_run(course, props)

    assert LearningResourceRun.objects.count() == 1

    # assert we got a course run back
    assert isinstance(result, LearningResourceRun)

    for key, value in props.items():
        assert getattr(result, key) == value, f"Property {key} should equal {value}"


@pytest.mark.parametrize("parent_factory", [CourseFactory, ProgramFactory, RunFactory])
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


@pytest.mark.parametrize("parent_factory", [ProgramFactory, RunFactory])
@pytest.mark.parametrize("prices_exist", [True, False])
def test_load_prices(parent_factory, prices_exist):
    """Test that load_prices creates and/or assigns prices to the parent object"""
    prices = (
        CoursePriceFactory.create_batch(3)
        if prices_exist
        else CoursePriceFactory.build_batch(3)
    )
    parent = parent_factory.create(no_prices=True)

    assert parent.prices.count() == 0

    load_prices(
        parent,
        [
            {
                "price": price.price,
                "mode": price.mode,
                "upgrade_deadline": price.upgrade_deadline,
            }
            for price in prices
        ],
    )

    assert parent.prices.count() == len(prices)


@pytest.mark.parametrize("instructor_exists", [True, False])
def test_load_instructors(instructor_exists):
    """Test that load_instructors creates and/or assigns instructors to the course run"""
    instructors = (
        CourseInstructorFactory.create_batch(3)
        if instructor_exists
        else CourseInstructorFactory.build_batch(3)
    )
    run = RunFactory.create(no_instructors=True)

    assert run.instructors.count() == 0

    load_instructors(
        run, [{"full_name": instructor.full_name} for instructor in instructors]
    )

    assert run.instructors.count() == len(instructors)
