"""Course catalog data loaders"""
from django.contrib.contenttypes.models import ContentType

from course_catalog.models import Course, Program, ProgramItem


def load_course(course_data):
    """Load the course into the database"""
    course_id = course_data.pop("course_id")
    course, _ = Course.objects.update_or_create(
        course_id=course_id, defaults=course_data
    )

    return course


def load_program(program_data):
    """Load the program into the database"""
    program_id = program_data.pop("program_id")
    courses_data = program_data.pop("courses")

    program, _ = Program.objects.update_or_create(
        program_id=program_id, defaults=program_data
    )

    courses = []
    course_content_type = ContentType.objects.get(model="course")

    for position, course_data in enumerate(courses_data):
        # skip courses that don't define a course_id
        if not course_data.get("course_id", None):
            continue

        course = load_course(course_data)
        courses.append(course)

        # create a program item or update its position
        ProgramItem.objects.update_or_create(
            program=program,
            content_type=course_content_type,
            object_id=course.id,
            defaults={"position": position},
        )

    # remove courses from the program that are no longer
    program.items.filter(content_type=course_content_type).exclude(
        object_id__in=[course.id for course in courses]
    ).delete()

    return program


def load_programs(programs_data):
    """Load programs into the database"""
    return [load_program(program_data) for program_data in programs_data]
