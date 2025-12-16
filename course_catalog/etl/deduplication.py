"""Functions to combine duplicate courses"""
import requests
import yaml
from django.conf import settings
from django.db.models import Count

from course_catalog.constants import AvailabilityType, PlatformType
from course_catalog.models import Course


def get_most_relevant_run(runs):
    """Helper function to determine the most relevant course run.

    Args:
        runs (QuerySet): a set of LearningResourseRun objects
    Returns:
        A LearningResourseRun object

    """
    # if there is a current run in the set pick it
    most_relevant_run = next(
        (run for run in runs if run.availability == AvailabilityType.current.value),
        None,
    )

    if not most_relevant_run:
        # if there a future runs in the set, pick the one with earliest start date
        runs = runs.order_by("best_start_date")
        most_relevant_run = next(
            (
                run
                for run in runs
                if run.availability
                in [
                    AvailabilityType.upcoming.value,
                    AvailabilityType.starting_soon.value,
                ]
            ),
            None,
        )

        if not most_relevant_run:
            # get latest past run by start date
            most_relevant_run = next(run for run in runs.reverse())

    return most_relevant_run


def generate_duplicates_yaml():
    """Generate updated list of mitx duplicates"""
    platform = PlatformType.mitx.name
    duplicates_url = settings.DUPLICATE_COURSES_URL

    if duplicates_url is not None:
        response = requests.get(duplicates_url)
        response.raise_for_status()
        existing_duplicates_for_all_platforms = yaml.safe_load(response.text)
    else:
        existing_duplicates_for_all_platforms = {}

    if platform in existing_duplicates_for_all_platforms:
        desired_course_ids_from_existing_duplicate_file = [
            group["course_id"]
            for group in existing_duplicates_for_all_platforms[platform]
        ]
    else:
        desired_course_ids_from_existing_duplicate_file = []

    duplicate_titles = (
        Course.objects.values_list("title", flat=True)
        .annotate(Count("id"))
        .filter(id__count__gt=1)
        .filter(platform=platform)
    )
    duplicate_courses = (
        Course.objects.filter(title__in=[title for title in duplicate_titles])
        .annotate(Count("offered_by"))
        .values("course_id", "title", "offered_by__count")
        .order_by("title")
    )
    duplicate_course_groups = [
        [course for course in duplicate_courses if course["title"] == title]
        for title in duplicate_titles
    ]

    output_for_platform = []
    for group in duplicate_course_groups:
        # The sort sets the first course id in the group to, in order of priority
        # 1) The current desired course id in the duplicate_courses.yml config file if any
        # 2) The course with multiple offered_by values if any. Micromasters courses are offered by both micromasters and mitx

        group.sort(
            key=lambda course: [
                course["course_id"] in desired_course_ids_from_existing_duplicate_file,
                course["offered_by__count"],
            ],
            reverse=True,
        )
        duplicate_course_ids = [course["course_id"] for course in group]
        course_id = group[0]["course_id"]
        title = group[0]["title"]
        output_for_platform.append(
            {
                "duplicate_course_ids": duplicate_course_ids,
                "course_id": course_id,
                "title": title,
            }
        )

    output = {platform: output_for_platform}

    return yaml.dump(output)
