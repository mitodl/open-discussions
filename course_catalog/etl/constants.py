"""Constants for course catalog ETL processes"""
from django.conf import settings

# A custom UA so that operators of OpenEdx will know who is pinging their service
COMMON_HEADERS = {
    "User-Agent": f"CourseCatalogBot/{settings.VERSION} ({settings.SITE_BASE_URL})"
}
