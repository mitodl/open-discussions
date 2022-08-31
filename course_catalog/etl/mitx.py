"""MITx course catalog ETL"""
import csv
import logging

from django.conf import settings
from django.utils.functional import SimpleLazyObject
from toolz import compose, curried

from course_catalog.constants import MIT_OWNER_KEYS, OfferedBy, PlatformType
from course_catalog.etl.openedx import (
    OpenEdxConfiguration,
    openedx_extract_transform_factory,
)

log = logging.getLogger()


def _is_mit_course(course):
    """
    Helper function to determine if a course is an MIT course

    Args:
        course (dict): The JSON object representing the course with all its course runs

    Returns:
        bool: indicates whether the course is owned by MIT
    """
    for owner in course.get("owners"):
        if owner["key"] in MIT_OWNER_KEYS:
            return True
    return False


def _load_edx_topic_mappings():
    """
    Loads the topic mappings from the crosswalk CSV file

    Returns:
        dict:
            the mapping dictionary
    """
    with open("course_catalog/data/edx-topic-mappings.csv", "r") as mapping_file:
        # drop the column headers (first row)
        # assumes the csv is in "source topic, dest target" format
        return dict(list(csv.reader(mapping_file))[1:])


EDX_TOPIC_MAPPINGS = SimpleLazyObject(_load_edx_topic_mappings)


def _remap_mitx_topics(course):
    """
    Remap mitx topics using a crosswalk csv, excluding topics that don't appear in the mapping

    Args:
        course (dict): The JSON object representing the course with all its course runs

    Returns:
        dict:
            the course with the remapped topics
    """
    topics = []
    for topic in course.get("topics", []):
        topic_name = topic["name"]
        mapped_topic_name = EDX_TOPIC_MAPPINGS.get(topic_name, None)

        if mapped_topic_name is None:
            log.info(
                "Failed to map mitx topic '%s' for course '%s'",
                topic_name,
                course["course_id"],
            )
            continue

        topics.append({"name": mapped_topic_name})

    return {**course, "topics": topics}


# use the OpenEdx factory to create our extract and transform funcs
extract, _transform = openedx_extract_transform_factory(
    lambda: OpenEdxConfiguration(
        settings.EDX_API_CLIENT_ID,
        settings.EDX_API_CLIENT_SECRET,
        settings.EDX_API_ACCESS_TOKEN_URL,
        settings.EDX_API_URL,
        settings.MITX_BASE_URL,
        settings.MITX_ALT_URL,
        PlatformType.mitx.value,
        OfferedBy.mitx.value,
    )
)

# modified transform function that filters the course list to ones that pass the _is_mit_course() predicate
transform = compose(
    curried.map(_remap_mitx_topics), _transform, curried.filter(_is_mit_course)
)
