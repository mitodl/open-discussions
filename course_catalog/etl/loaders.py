"""Course catalog data loaders"""
from django.contrib.contenttypes.models import ContentType

from course_catalog.models import (
    Course,
    CourseInstructor,
    CoursePrice,
    CourseTopic,
    LearningResourceRun,
    LearningResourceOfferor,
    Program,
    ProgramItem,
)
from course_catalog.etl.utils import log_exceptions

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


def load_offered_bys(resource, offered_bys_data):
    """Loads a list of offered_by into the resource. This operation is additive-only."""
    offered_bys = []

    for offered_by_data in offered_bys_data:
        offered_by, _ = LearningResourceOfferor.objects.get_or_create(
            name=offered_by_data["name"]
        )
        resource.offered_by.add(offered_by)

    resource.save()
    return offered_bys


def load_run(learning_resource, course_run_data):
    """Load the course run into the database"""
    run_id = course_run_data.pop("run_id")
    platform = course_run_data.get("platform")
    instructors_data = course_run_data.pop("instructors", [])
    prices_data = course_run_data.pop("prices", [])
    topics_data = course_run_data.pop("topics", [])
    offered_bys_data = course_run_data.pop("offered_by", [])

    learning_resource_run, _ = LearningResourceRun.objects.update_or_create(
        run_id=run_id,
        platform=platform,
        defaults={
            **course_run_data,
            "object_id": learning_resource.id,
            "content_type": ContentType.objects.get_for_model(learning_resource),
        },
    )

    load_topics(learning_resource_run, topics_data)
    load_prices(learning_resource_run, prices_data)
    load_instructors(learning_resource_run, instructors_data)
    load_offered_bys(learning_resource_run, offered_bys_data)

    return learning_resource_run


def load_course(course_data):
    """Load the course into the database"""
    course_id = course_data.pop("course_id")
    platform = course_data.get("platform")
    runs_data = course_data.pop("runs", [])
    topics_data = course_data.pop("topics", [])
    offered_bys_data = course_data.pop("offered_by", [])

    course, created = Course.objects.update_or_create(
        platform=platform, course_id=course_id, defaults=course_data
    )

    load_topics(course, topics_data)
    load_offered_bys(course, offered_bys_data)

    for course_run_data in runs_data:
        load_run(course, course_run_data)

    if not created and not course.published:
        search_task_helpers.delete_course(course)
    elif course.published:
        search_task_helpers.upsert_course(course)

    return course


@log_exceptions("Error loading courses")
def load_courses(courses_data):
    """Load a list of programs"""
    return [load_course(course_data) for course_data in courses_data]


@log_exceptions("Error loading program")
def load_program(program_data):
    """Load the program into the database"""
    program_id = program_data.pop("program_id")
    courses_data = program_data.pop("courses")
    topics_data = program_data.pop("topics", [])
    runs_data = program_data.pop("runs")
    offered_bys_data = program_data.pop("offered_by", [])

    program, created = Program.objects.update_or_create(
        program_id=program_id, defaults=program_data
    )

    load_topics(program, topics_data)
    load_offered_bys(program, offered_bys_data)

    for run_data in runs_data:
        load_run(program, run_data)

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
    """Load a list of programs"""
    return [load_program(program_data) for program_data in programs_data]
