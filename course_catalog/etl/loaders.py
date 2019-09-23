"""Course catalog data loaders"""
from django.contrib.contenttypes.models import ContentType

from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    CourseRun,
    Program,
    ProgramItem,
)

from search import task_helpers as search_task_helpers


def load_topics(resource, topics_data):
    """Load the topics for a resource into the database"""
    topics = []

    for topic_data in topics_data:
        topic, _ = CourseTopic.objects.get_or_create(name=topic_data["name"])
        topics.append(topic)

    resource.topics.set(topics)
    resource.save()
    return topics


def load_prices(resource, prices_data):
    """Load the prices for a resource into the database"""
    prices = []

    for price_data in prices_data:
        price, _ = CoursePrice.objects.get_or_create(
            price=price_data.get("price", ""),
            mode=price_data.get("mode", ""),
            upgrade_deadline=price_data.get("upgrade_deadline", None),
        )
        prices.append(price)

    resource.prices.set(prices)
    resource.save()
    return prices


def load_instructors(resource, instructors_data):
    """Load the prices for a resource into the database"""
    instructors = []

    for instructor_data in instructors_data:
        instructor, _ = CourseInstructor.objects.get_or_create(**instructor_data)
        instructors.append(instructor)

    resource.instructors.set(instructors)
    resource.save()
    return instructors


def load_course_run(course_or_bootcamp, course_run_data):
    """Load the course run into the database"""
    course_run_id = course_run_data.pop("course_run_id")
    instructors_data = course_run_data.pop("instructors", [])
    prices_data = course_run_data.pop("prices", [])
    topics_data = course_run_data.pop("topics", [])

    course_run, _ = CourseRun.objects.update_or_create(
        course_run_id=course_run_id,
        object_id=course_or_bootcamp.id,
        content_type=ContentType.objects.get_for_model(course_or_bootcamp),
        defaults=course_run_data,
    )

    load_topics(course_run, topics_data)
    load_prices(course_run, prices_data)
    load_instructors(course_run, instructors_data)

    return course_run


def load_course(course_data):
    """Load the course into the database"""
    course_id = course_data.pop("course_id")
    course_runs_data = course_data.pop("course_runs", [])
    topics_data = course_data.pop("topics", [])

    course, created = Course.objects.update_or_create(
        course_id=course_id, defaults=course_data
    )

    load_topics(course, topics_data)

    for course_run_data in course_runs_data:
        load_course_run(course, course_run_data)

    if not created and not course.published:
        search_task_helpers.delete_course(course)
    elif course.published:
        search_task_helpers.upsert_course(course)

    return course


def load_program(program_data):
    """Load the program into the database"""
    program_id = program_data.pop("program_id")
    courses_data = program_data.pop("courses")
    topics_data = program_data.pop("topics", [])
    prices_data = program_data.pop("prices", [])

    program, created = Program.objects.update_or_create(
        program_id=program_id, defaults=program_data
    )

    load_topics(program, topics_data)
    load_prices(program, prices_data)

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

    if not created and not program.published:
        search_task_helpers.delete_program(program)
    elif program.published:
        search_task_helpers.upsert_program(program)

    return program


def load_programs(programs_data):
    """Load programs into the database"""
    return [load_program(program_data) for program_data in programs_data]
