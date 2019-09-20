"""MicroMasters course catalog ETL"""
from django.conf import settings
import requests

from course_catalog.constants import OfferedBy
from course_catalog.etl.constants import COMMON_HEADERS
from course_catalog.etl.utils import log_exceptions


@log_exceptions("Error extracting MicroMasters catalog", exc_return_value=[])
def extract():
    """Loads the MicroMasters catalog data"""
    if settings.MICROMASTERS_CATALOG_API_URL:
        return requests.get(
            settings.MICROMASTERS_CATALOG_API_URL, headers={**COMMON_HEADERS}
        ).json()
    return []


@log_exceptions("Error extracting MicroMasters catalog", exc_return_value=[])
def transform(programs):
    """Transform the micromasters catalog data"""
    # normalize the micromasters data into the course_catalog/models.py data structures
    return [
        {
            "program_id": program["id"],
            "title": program["title"],
            "url": program["programpage_url"],
            "image_src": program["thumbnail_url"],
            "offered_by": OfferedBy.micromasters.value,
            # all we need for course data is the relative positioning of courses by course_id
            "courses": [
                {
                    "course_id": course["edx_key"],
                    "offered_by": OfferedBy.micromasters.value
                    # TBD: how to handle merging `offered_by` for courses and course runs
                }
                for course in sorted(
                    program["courses"], key=lambda course: course["position_in_program"]
                )
            ],
        }
        for program in programs
    ]
