"""Tests for ETL loaders"""
from django.contrib.contenttypes.models import ContentType
import pytest

from course_catalog.etl.loaders import load_programs, load_program, load_course
from course_catalog.factories import ProgramFactory, CourseFactory
from course_catalog.models import Program, Course, ProgramItem

pytestmark = pytest.mark.django_db


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
@pytest.mark.parametrize("courses_exist", [True, False])
@pytest.mark.parametrize("has_retired_course", [True, False])
def test_load_program(program_exists, courses_exist, has_retired_course):
    """Test that load_program loads the program"""
    program = ProgramFactory.create() if program_exists else ProgramFactory.build()

    courses = (
        CourseFactory.create_batch(2) if courses_exist else CourseFactory.build_batch(2)
    )

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
            "courses": [{"course_id": course.course_id} for course in courses],
        }
    )

    assert Program.objects.count() == 1
    assert Course.objects.count() == after_course_count

    # assert we got a program back and that each course is in a program
    assert isinstance(result, Program)
    assert result.items.count() == len(courses)
    for item, data in zip(result.items.all(), courses):
        course = item.item
        assert isinstance(course, Course)
        assert course.course_id == data.course_id


@pytest.mark.parametrize("course_exists", [True, False])
def test_load_course(course_exists):
    """Test that load_course loads the course"""
    course = CourseFactory.create() if course_exists else CourseFactory.build()
    assert Course.objects.count() == (1 if course_exists else 0)

    result = load_course({"course_id": course.course_id})

    assert Course.objects.count() == 1

    # assert we got a course back
    assert isinstance(result, Course)
    assert result.course_id == course.course_id
