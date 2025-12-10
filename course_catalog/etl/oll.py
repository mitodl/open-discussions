"""MITx course catalog ETL"""
from django.conf import settings
from toolz import compose, curried

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.openedx import (
    OpenEdxConfiguration,
    openedx_extract_transform_factory,
)

# use the OpenEdx factory to create our extract and transform funcs
extract, _transform = openedx_extract_transform_factory(
    lambda: OpenEdxConfiguration(
        settings.OLL_API_CLIENT_ID,
        settings.OLL_API_CLIENT_SECRET,
        settings.OLL_API_ACCESS_TOKEN_URL,
        settings.OLL_API_URL,
        settings.OLL_BASE_URL,
        settings.OLL_ALT_URL,
        PlatformType.oll.value,
        OfferedBy.oll.value,
    )
)


def _add_free_prices(course):
    """Adds a free price to all runs

    Args:
        course (Course): the course to update

    Returns:
        Course: updated course

    """
    for run in course["runs"]:
        run["prices"].append({"price": 0})

    return course


# map over all items, adding a free price to each since all OLL courses are free
transform = compose(curried.map(_add_free_prices), _transform)
