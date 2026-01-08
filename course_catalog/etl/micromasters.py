"""MicroMasters course catalog ETL"""
import copy

import requests
from django.conf import settings

from course_catalog.constants import OfferedBy, PlatformType
from course_catalog.etl.constants import COMMON_HEADERS

OFFERED_BY = [{"name": OfferedBy.micromasters.value}]


def extract():
    """Loads the MicroMasters catalog data"""
    if settings.MICROMASTERS_CATALOG_API_URL:
        return requests.get(
            settings.MICROMASTERS_CATALOG_API_URL, headers={**COMMON_HEADERS}
        ).json()
    return []


def transform(programs):
    """Transform the micromasters catalog data"""
    # normalize the micromasters data into the course_catalog/models.py data structures
    return [
        {
            "program_id": program["id"],
            "title": program["title"],
            "url": program["programpage_url"],
            "image_src": program["thumbnail_url"],
            "offered_by": copy.deepcopy(OFFERED_BY),
            "runs": [
                {
                    "run_id": program["id"],
                    "platform": PlatformType.micromasters.value,
                    "title": program["title"],
                    "offered_by": copy.deepcopy(OFFERED_BY),
                    "instructors": [
                        {"full_name": instructor["name"]}
                        for instructor in program["instructors"]
                    ],
                    "prices": [{"price": program["total_price"]}],
                    "start_date": program["start_date"],
                    "end_date": program["end_date"],
                    "enrollment_start": program["enrollment_start"],
                    "best_start_date": program["enrollment_start"]
                    or program["start_date"],
                    "best_end_date": program["end_date"],
                }
            ],
            "topics": program["topics"],
            # all we need for course data is the relative positioning of courses by course_id
            "courses": [
                {
                    # `platform` is specified as mitx here because that allows this data to merge with data sourced from MITx
                    # we want this because all the course data is populated from MITx and we just want to
                    # indicate that each of these courses are also offered by MicroMasters
                    "course_id": course["edx_key"],
                    "platform": PlatformType.mitx.value,
                    "offered_by": copy.deepcopy(OFFERED_BY),
                    "runs": [
                        {
                            "run_id": run["edx_course_key"],
                            "platform": PlatformType.mitx.value,
                            "offered_by": copy.deepcopy(OFFERED_BY),
                        }
                        for run in course["course_runs"]
                        if run.get("edx_course_key", None)
                    ],
                }
                for course in sorted(
                    program["courses"], key=lambda course: course["position_in_program"]
                )
            ],
        }
        for program in programs
    ]
