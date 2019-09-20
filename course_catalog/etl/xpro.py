"""xPro course catalog ETL"""
from datetime import datetime

from django.conf import settings
import requests
import pytz

from course_catalog.constants import OfferedBy
from course_catalog.etl.utils import log_exceptions


XPRO_DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def _parse_datetime(value):
    """
    Parses an xPro datetime string

    Args:
        value(str): the datetime in string format

    Returns:
        datetime: the parsed datetime
    """
    return (
        datetime.strptime(value, XPRO_DATETIME_FORMAT).replace(tzinfo=pytz.utc)
        if value
        else None
    )


@log_exceptions("Error extracting xPro catalog", exc_return_value=[])
def extract():
    """Loads the xPro catalog data"""
    if settings.XPRO_CATALOG_API_URL:
        return requests.get(settings.XPRO_CATALOG_API_URL).json()
    return []


@log_exceptions("Error transforming MicroMasters catalog", exc_return_value=[])
def transform(programs):
    """Transform the xPro catalog data"""
    # normalize the xPro data into the course_catalog/models.py data structures
    return [
        {
            "program_id": program["readable_id"],
            "title": program["title"],
            "image_src": program["thumbnail_url"],
            "short_description": program["description"],
            "offered_by": OfferedBy.xpro.value,
            "published": bool(
                program["current_price"]
            ),  # a program is only considered published if it has a product/price
            "prices": [{"price": program["current_price"]}]
            if program.get("current_price", None)
            else [],
            "courses": [
                {
                    "course_id": course["readable_id"],
                    "title": course["title"],
                    "image_src": course["thumbnail_url"],
                    "offered_by": OfferedBy.xpro.value,
                    "short_description": course["description"],
                    "published": any(
                        map(
                            lambda course_run: course_run.get("current_price", None),
                            course["courseruns"],
                        )
                    ),
                    "course_runs": [
                        {
                            "course_run_id": course_run["courseware_id"],
                            "start_date": _parse_datetime(course_run["start_date"]),
                            "end_date": _parse_datetime(course_run["end_date"]),
                            "enrollment_start": _parse_datetime(
                                course_run["enrollment_start"]
                            ),
                            "enrollment_end": _parse_datetime(
                                course_run["enrollment_end"]
                            ),
                            "best_start_date": _parse_datetime(
                                course_run["enrollment_start"]
                            )
                            or _parse_datetime(course_run["start_date"]),
                            "best_end_date": _parse_datetime(
                                course_run["enrollment_end"]
                            )
                            or _parse_datetime(course_run["end_date"]),
                            "offered_by": OfferedBy.xpro.value,
                            "published": bool(course_run["current_price"]),
                            "prices": [{"price": course_run["current_price"]}]
                            if course_run.get("current_price", None)
                            else [],
                            "instructors": [
                                {"full_name": instructor["name"]}
                                for instructor in course_run["instructors"]
                            ],
                        }
                        for course_run in course["courseruns"]
                    ],
                }
                for course in program["courses"]
            ],
        }
        for program in programs
    ]
