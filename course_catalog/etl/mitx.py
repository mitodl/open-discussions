"""MITx course catalog ETL"""
from django.conf import settings
from toolz import compose, curried

from course_catalog.constants import OfferedBy, PlatformType, MIT_OWNER_KEYS
from course_catalog.etl.openedx import (
    OpenEdxConfiguration,
    openedx_extract_transform_factory,
)


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


# use the OpenEdx factory to create our extract and transform funcs
extract, _transform = openedx_extract_transform_factory(
    OpenEdxConfiguration(
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
transform = compose(_transform, curried.filter(_is_mit_course))
